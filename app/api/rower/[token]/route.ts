import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Find the rower by token
    const { data: rower, error: rowerError } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('token', token)
      .single();

    if (rowerError || !rower) {
      return NextResponse.json(
        { error: 'Rower not found' },
        { status: 404 }
      );
    }

    // Get all assignments for this rower
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('assignments')
      .select(`
        *,
        bookings (
          *,
          customers (*),
          available_dates (*)
        )
      `)
      .eq('rower_id', rower.id)
      .order('created_at', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // For each assignment, get other crew members on the same booking
    const assignmentsWithCrew = await Promise.all(
      (assignments || []).map(async (assignment) => {
        const { data: crewmates } = await supabaseAdmin
          .from('assignments')
          .select('rowers (*)')
          .eq('booking_id', assignment.booking_id)
          .neq('id', assignment.id);

        return {
          ...assignment,
          crewmates: crewmates?.map(c => c.rowers) || []
        };
      })
    );

    // Count completed assignments
    const { data: completedAssignments } = await supabaseAdmin
      .from('assignments')
      .select('id')
      .eq('completed_by', rower.id)
      .eq('status', 'completed');

    const completedCount = completedAssignments?.length || 0;

    return NextResponse.json({
      rower,
      assignments: assignmentsWithCrew,
      completedCount
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
