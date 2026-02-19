import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = id;

    // Validate assignment ID is a valid UUID
    if (!isValidUUID(assignmentId)) {
      return NextResponse.json(
        { error: 'Invalid assignment ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { rower_id } = body;

    // Validate rower_id is provided
    if (!rower_id) {
      return NextResponse.json(
        { error: 'rower_id is required' },
        { status: 400 }
      );
    }

    // Validate rower_id is a valid UUID
    if (!isValidUUID(rower_id)) {
      return NextResponse.json(
        { error: 'Invalid rower_id format' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if new rower exists
    const { data: rower, error: rowerError } = await supabaseAdmin
      .from('rowers')
      .select('id')
      .eq('id', rower_id)
      .single();

    if (rowerError || !rower) {
      return NextResponse.json(
        { error: 'Rower not found' },
        { status: 404 }
      );
    }

    // Update assignment to new rower
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .update({ rower_id })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, assignment: data });
  } catch (error) {
    console.error('Assignment reassignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = id;

    // Validate assignment ID is a valid UUID
    if (!isValidUUID(assignmentId)) {
      return NextResponse.json(
        { error: 'Invalid assignment ID format' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Delete the assignment
    const { error } = await supabaseAdmin
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Assignment deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
