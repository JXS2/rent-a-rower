import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    // Verify signature is present
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook secret is configured
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Construct and verify the event
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract booking_id from metadata
      const booking_id = session.metadata?.booking_id;

      if (!booking_id) {
        console.error('Missing booking_id in session metadata');
        return NextResponse.json(
          { error: 'Missing booking_id in metadata' },
          { status: 400 }
        );
      }

      // Update booking payment_status to 'paid'
      const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', booking_id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update booking:', error);

        // Check if booking doesn't exist
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Booking not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: 'Failed to update booking' },
          { status: 500 }
        );
      }

      console.log(`Successfully updated booking ${booking_id} to paid status`);
    }

    // Return 200 success response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
