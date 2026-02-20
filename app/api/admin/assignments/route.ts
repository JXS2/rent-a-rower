import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('date_id');

    if (!dateId) {
      return NextResponse.json(
        { error: 'date_id is required' },
        { status: 400 }
      );
    }

    // Get all bookings for this date
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(
        `
        id,
        num_rowers,
        customers!inner(name, address, distance_miles)
      `
      )
      .eq('date_id', dateId);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Get all assignments for these bookings
    const groups = await Promise.all(
      (bookings || []).map(async (booking: any) => {
        const { data: assignments, error: assignmentsError } =
          await supabaseAdmin
            .from('assignments')
            .select(
              `
              *,
              rowers!assignments_rower_id_fkey(*)
            `
            )
            .eq('booking_id', booking.id);

        if (assignmentsError) {
          console.error('Error fetching assignments:', assignmentsError);
          return null;
        }

        const customer = Array.isArray(booking.customers)
          ? booking.customers[0]
          : booking.customers;

        return {
          booking: {
            id: booking.id,
            customer_name: customer?.name || 'Unknown',
            customer_address: customer?.address || 'Unknown',
            distance_miles: customer?.distance_miles,
            num_rowers: booking.num_rowers,
          },
          assignments: assignments || [],
        };
      })
    );

    return NextResponse.json({
      groups: groups.filter((g) => g !== null),
    });
  } catch (error) {
    console.error('Assignments fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
