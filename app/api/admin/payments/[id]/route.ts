import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = id;

    // Update the payment status to 'paid'
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment status:', error);
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
