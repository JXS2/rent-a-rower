import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSwapDeclinedNotification } from '@/lib/email';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find the swap by replacement token
    const { data: swap, error: swapError } = await supabaseAdmin
      .from('swaps')
      .select(`
        *,
        assignments (
          *,
          bookings (
            *,
            customers (*),
            available_dates (*)
          )
        )
      `)
      .eq('replacement_token', token)
      .single();

    if (swapError || !swap) {
      return new NextResponse(
        `<html><body><h1>Swap not found</h1><p>This swap link is invalid or has expired.</p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if swap has already been processed
    if (swap.status !== 'pending') {
      return new NextResponse(
        `<html><body><h1>Swap already processed</h1><p>This swap was already ${swap.status}.</p></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get original and replacement rower info
    const { data: originalRower } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('id', swap.original_rower_id)
      .single();

    const { data: replacementRower } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('id', swap.replacement_rower_id)
      .single();

    if (!originalRower || !replacementRower) {
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Rower information not found.</p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Update swap status to declined
    const { error: swapUpdateError } = await supabaseAdmin
      .from('swaps')
      .update({ status: 'declined' })
      .eq('id', swap.id);

    if (swapUpdateError) {
      console.error('Error updating swap:', swapUpdateError);
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Failed to decline swap. Please try again.</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Update assignment: set status back to assigned (original rower remains assigned)
    const { error: assignmentUpdateError } = await supabaseAdmin
      .from('assignments')
      .update({ status: 'assigned' })
      .eq('id', swap.assignment_id);

    if (assignmentUpdateError) {
      console.error('Error updating assignment:', assignmentUpdateError);
      // Rollback swap status
      await supabaseAdmin
        .from('swaps')
        .update({ status: 'pending' })
        .eq('id', swap.id);
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Failed to update assignment. Please try again.</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Send notification email to original rower
    const assignment = swap.assignments;
    const booking = assignment?.bookings;
    const customer = booking?.customers;
    const date = booking?.available_dates?.date;

    await sendSwapDeclinedNotification(originalRower.email, replacementRower.name, {
      date: date ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'Date TBD',
      customerName: customer?.name || 'Customer TBD'
    });

    return new NextResponse(
      `<html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { color: #dc2626; }
            .details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Swap Declined</h1>
          <p>You have declined this swap request.</p>
          <div class="details">
            <p><strong>Date:</strong> ${date ? new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'Date TBD'}</p>
            <p><strong>Customer:</strong> ${customer?.name || 'Customer TBD'}</p>
          </div>
          <p>${originalRower.name} has been notified. They remain assigned to this job.</p>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('API error:', error);
    return new NextResponse(
      `<html><body><h1>Error</h1><p>An unexpected error occurred.</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
