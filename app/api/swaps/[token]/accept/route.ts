import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSwapAcceptedNotification } from '@/lib/email';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

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

    // Update swap status to accepted
    const { error: swapUpdateError } = await supabaseAdmin
      .from('swaps')
      .update({ status: 'accepted' })
      .eq('id', swap.id);

    if (swapUpdateError) {
      console.error('Error updating swap:', swapUpdateError);
      return new NextResponse(
        `<html><body><h1>Error</h1><p>Failed to accept swap. Please try again.</p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Update assignment: change rower_id to replacement rower, set status back to assigned
    const { error: assignmentUpdateError } = await supabaseAdmin
      .from('assignments')
      .update({
        rower_id: swap.replacement_rower_id,
        status: 'assigned'
      })
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

    // Send confirmation email to original rower
    const assignment = swap.assignments;
    const booking = assignment?.bookings;
    const customer = booking?.customers;
    const date = booking?.available_dates?.date;

    await sendSwapAcceptedNotification(originalRower.email, replacementRower.name, {
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
            h1 { color: #16a34a; }
            .details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>✓ Swap Accepted!</h1>
          <p>You have successfully accepted this swap.</p>
          <div class="details">
            <p><strong>Date:</strong> ${date ? new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'Date TBD'}</p>
            <p><strong>Customer:</strong> ${customer?.name || 'Customer TBD'}</p>
            <p><strong>Address:</strong> ${customer?.address || 'Address TBD'}</p>
          </div>
          <p>${originalRower.name} has been notified. You are now assigned to this job.</p>
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
