import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assignRowers, BookingWithCustomer, RowerWithAvailability } from '@/lib/assignment';
import { Booking, Rower, Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date_id } = body;

    // Validate date_id is provided
    if (!date_id) {
      return NextResponse.json(
        { error: 'date_id is required' },
        { status: 400 }
      );
    }

    // Validate date exists and belongs to active season
    const { data: dateData, error: dateError } = await supabaseAdmin
      .from('available_dates')
      .select(`
        id,
        date,
        season_id,
        seasons!inner(id, active)
      `)
      .eq('id', date_id)
      .single();

    if (dateError || !dateData) {
      return NextResponse.json(
        { error: 'Date not found' },
        { status: 404 }
      );
    }

    // Check if season is active
    const season = Array.isArray(dateData.seasons)
      ? dateData.seasons[0]
      : dateData.seasons;

    if (!season || !season.active) {
      return NextResponse.json(
        { error: 'Date does not belong to active season' },
        { status: 400 }
      );
    }

    // Fetch all bookings for the date with customer data
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        customer_id,
        date_id,
        num_rowers,
        payment_method,
        payment_status,
        stripe_payment_id,
        total_amount,
        status,
        created_at,
        customers!inner(
          id,
          name,
          email,
          phone,
          address,
          latitude,
          longitude,
          distance_miles,
          created_at
        )
      `)
      .eq('date_id', date_id)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Handle case where no bookings exist for the date
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        assignments: [],
        unfilled: [],
        warnings: ['No confirmed bookings found for this date']
      });
    }

    // Fetch all rowers in active season
    const { data: rowers, error: rowersError } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('season_id', dateData.season_id);

    if (rowersError) {
      console.error('Error fetching rowers:', rowersError);
      return NextResponse.json(
        { error: 'Failed to fetch rowers' },
        { status: 500 }
      );
    }

    // Handle case where no rowers exist in active season
    if (!rowers || rowers.length === 0) {
      return NextResponse.json({
        assignments: [],
        unfilled: bookings.map((b: any) => ({
          bookingId: b.id,
          needed: b.num_rowers,
          assigned: 0,
          reason: 'No rowers available in active season'
        })),
        warnings: ['No rowers found in active season']
      });
    }

    // For each rower, query assignment counts
    const rowersWithAvailability: RowerWithAvailability[] = await Promise.all(
      rowers.map(async (rower: Rower) => {
        // Count completed assignments (where they completed the job)
        const { count: completedCount, error: completedError } = await supabaseAdmin
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .eq('completed_by', rower.id)
          .eq('status', 'completed');

        if (completedError) {
          console.error(`Error fetching completed count for rower ${rower.id}:`, completedError);
        }

        // Count pending assignments (assigned or swap_pending)
        const { count: pendingCount, error: pendingError } = await supabaseAdmin
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .eq('rower_id', rower.id)
          .in('status', ['assigned', 'swap_pending']);

        if (pendingError) {
          console.error(`Error fetching pending count for rower ${rower.id}:`, pendingError);
        }

        return {
          ...rower,
          completed_count: completedCount || 0,
          pending_count: pendingCount || 0
        };
      })
    );

    // Transform bookings to match BookingWithCustomer type
    const bookingsWithCustomer: BookingWithCustomer[] = bookings.map((booking: any) => {
      const customer = Array.isArray(booking.customers)
        ? booking.customers[0]
        : booking.customers;

      return {
        id: booking.id,
        customer_id: booking.customer_id,
        date_id: booking.date_id,
        num_rowers: booking.num_rowers,
        payment_method: booking.payment_method,
        payment_status: booking.payment_status,
        stripe_payment_id: booking.stripe_payment_id,
        total_amount: booking.total_amount,
        status: booking.status,
        created_at: booking.created_at,
        customers: customer
      };
    });

    // Call assignment algorithm
    const result = assignRowers(date_id, bookingsWithCustomer, rowersWithAvailability);

    // Before inserting, delete existing assignments for this date
    // Get all booking IDs for this date
    const bookingIds = bookings.map((b: any) => b.id);

    if (bookingIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('assignments')
        .delete()
        .in('booking_id', bookingIds);

      if (deleteError) {
        console.error('Error deleting existing assignments:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete existing assignments' },
          { status: 500 }
        );
      }
    }

    // Insert new assignment records
    if (result.assignments.length > 0) {
      const assignmentRecords = result.assignments.map(a => ({
        booking_id: a.bookingId,
        rower_id: a.rowerId,
        status: 'assigned'
      }));

      const { error: insertError } = await supabaseAdmin
        .from('assignments')
        .insert(assignmentRecords);

      if (insertError) {
        console.error('Error inserting assignments:', insertError);
        return NextResponse.json(
          { error: 'Failed to insert assignments' },
          { status: 500 }
        );
      }
    }

    // Return result
    return NextResponse.json({
      assignments: result.assignments,
      unfilled: result.unfilled,
      warnings: result.warnings
    });
  } catch (error) {
    console.error('Assignment run error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
