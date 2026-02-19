import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSwapRequest } from '@/lib/email';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignment_id, replacement_rower_id } = body;

    if (!assignment_id || !replacement_rower_id) {
      return NextResponse.json(
        { error: 'assignment_id and replacement_rower_id are required' },
        { status: 400 }
      );
    }

    // Fetch the assignment with booking and customer info
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .select(`
        *,
        bookings (
          *,
          customers (*),
          available_dates (*)
        )
      `)
      .eq('id', assignment_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if assignment is already in swap_pending or completed status
    if (assignment.status !== 'assigned') {
      return NextResponse.json(
        { error: `Cannot swap assignment with status: ${assignment.status}` },
        { status: 400 }
      );
    }

    // Get original rower info
    const { data: originalRower } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('id', assignment.rower_id)
      .single();

    // Get replacement rower info
    const { data: replacementRower } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('id', replacement_rower_id)
      .single();

    if (!originalRower || !replacementRower) {
      return NextResponse.json(
        { error: 'Rower not found' },
        { status: 404 }
      );
    }

    // Generate unique token for swap acceptance
    const replacementToken = nanoid(16);

    // Create swap record
    const { data: swap, error: swapError } = await supabaseAdmin
      .from('swaps')
      .insert({
        assignment_id,
        original_rower_id: assignment.rower_id,
        replacement_rower_id,
        replacement_token: replacementToken,
        status: 'pending'
      })
      .select()
      .single();

    if (swapError) {
      console.error('Error creating swap:', swapError);
      return NextResponse.json(
        { error: 'Failed to create swap' },
        { status: 500 }
      );
    }

    // Update assignment status to swap_pending
    const { error: updateError } = await supabaseAdmin
      .from('assignments')
      .update({ status: 'swap_pending' })
      .eq('id', assignment_id);

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      // Rollback swap creation
      await supabaseAdmin.from('swaps').delete().eq('id', swap.id);
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      );
    }

    // Send email to replacement rower
    const booking = assignment.bookings;
    const customer = booking?.customers;
    const date = booking?.available_dates?.date;

    const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/swaps/${replacementToken}/accept`;
    const declineUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/swaps/${replacementToken}/decline`;

    await sendSwapRequest(replacementRower.email, {
      requesterName: originalRower.name,
      date: date ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Date TBD',
      customerName: customer?.name || 'Customer TBD',
      address: customer?.address || 'Address TBD',
      acceptUrl,
      declineUrl
    });

    return NextResponse.json({ success: true, swap });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
