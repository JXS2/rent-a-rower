import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendAssignmentNotification } from '@/lib/email';

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

    // Get the date information
    const { data: dateData, error: dateError } = await supabaseAdmin
      .from('available_dates')
      .select('id, date')
      .eq('id', date_id)
      .single();

    if (dateError || !dateData) {
      return NextResponse.json(
        { error: 'Date not found' },
        { status: 404 }
      );
    }

    // Get all bookings for this date
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        customers!inner(
          name,
          address
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

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        count: 0,
        message: 'No bookings found for this date'
      });
    }

    // Get all assignments for this date grouped by booking
    const bookingIds = bookings.map((b: any) => b.id);
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('assignments')
      .select(`
        id,
        booking_id,
        status,
        rowers!inner(
          id,
          name,
          email,
          token
        )
      `)
      .in('booking_id', bookingIds)
      .in('status', ['assigned', 'swap_pending']);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        count: 0,
        message: 'No assignments found for this date'
      });
    }

    // Build a map of booking_id to customer info
    const bookingMap = new Map();
    bookings.forEach((booking: any) => {
      const customer = Array.isArray(booking.customers)
        ? booking.customers[0]
        : booking.customers;
      bookingMap.set(booking.id, {
        customerName: customer?.name || 'Unknown',
        address: customer?.address || 'Unknown'
      });
    });

    // Build a map of booking_id to list of rower names for crew info
    const crewMap = new Map<string, string[]>();
    assignments.forEach((assignment: any) => {
      const rower = Array.isArray(assignment.rowers)
        ? assignment.rowers[0]
        : assignment.rowers;
      if (!crewMap.has(assignment.booking_id)) {
        crewMap.set(assignment.booking_id, []);
      }
      crewMap.get(assignment.booking_id)!.push(rower?.name || 'Unknown');
    });

    // Send notification to each assigned rower
    const formattedDate = new Date(dateData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let emailsSent = 0;
    const emailPromises = assignments.map(async (assignment: any) => {
      const rower = Array.isArray(assignment.rowers)
        ? assignment.rowers[0]
        : assignment.rowers;

      if (!rower || !rower.email) {
        console.warn(`No rower or email found for assignment ${assignment.id}`);
        return;
      }

      const bookingInfo = bookingMap.get(assignment.booking_id);
      if (!bookingInfo) {
        console.warn(`No booking info found for assignment ${assignment.id}`);
        return;
      }

      const crewMembers = crewMap.get(assignment.booking_id) || [];
      const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/rower/${rower.token}`;

      try {
        await sendAssignmentNotification(rower.email, {
          date: formattedDate,
          customerName: bookingInfo.customerName,
          address: bookingInfo.address,
          crewMembers,
          portalUrl
        });
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send email to ${rower.email}:`, error);
      }
    });

    await Promise.all(emailPromises);

    return NextResponse.json({
      count: emailsSent,
      message: `Successfully sent ${emailsSent} notification email(s)`
    });
  } catch (error) {
    console.error('Notify rowers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
