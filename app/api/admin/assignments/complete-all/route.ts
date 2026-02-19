import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date_id } = body;

    if (!date_id) {
      return NextResponse.json(
        { error: 'date_id is required' },
        { status: 400 }
      );
    }

    // Get all bookings for this date
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('date_id', date_id);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings found for this date',
      });
    }

    const bookingIds = bookings.map((b) => b.id);

    // Get all assignments for these bookings
    const { data: assignments, error: assignmentsError } =
      await supabaseAdmin
        .from('assignments')
        .select('id, rower_id')
        .in('booking_id', bookingIds);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No assignments found for this date',
      });
    }

    // Update all assignments to completed
    const updates = assignments.map((assignment) =>
      supabaseAdmin
        .from('assignments')
        .update({
          status: 'completed',
          completed_by: assignment.rower_id,
        })
        .eq('id', assignment.id)
    );

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      updated: assignments.length,
    });
  } catch (error) {
    console.error('Complete all error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
