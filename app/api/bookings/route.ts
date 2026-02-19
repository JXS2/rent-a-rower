import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { geocodeAddress } from '@/lib/geocode';
import { stripe } from '@/lib/stripe';
import { sendBookingConfirmation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, address, date_id, num_rowers, payment_method } = await request.json();

    // Validate required fields
    if (!name || !email || !phone || !address || !date_id || !num_rowers || !payment_method) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate num_rowers
    if (num_rowers < 1 || num_rowers > 8) {
      return NextResponse.json(
        { error: 'Number of rowers must be between 1 and 8' },
        { status: 400 }
      );
    }

    // Validate payment_method
    if (payment_method !== 'stripe' && payment_method !== 'cash_check') {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Verify the date exists and bookings are open
    const { data: dateData, error: dateError } = await supabaseAdmin
      .from('available_dates')
      .select('*, seasons!inner(*)')
      .eq('id', date_id)
      .eq('bookings_open', true)
      .eq('seasons.active', true)
      .single();

    if (dateError || !dateData) {
      return NextResponse.json(
        { error: 'Selected date is not available for booking' },
        { status: 400 }
      );
    }

    // Geocode the address
    let latitude: number | null = null;
    let longitude: number | null = null;
    let distance_miles: number | null = null;

    const geocodeResult = await geocodeAddress(address);
    if (geocodeResult) {
      latitude = geocodeResult.lat;
      longitude = geocodeResult.lng;
      distance_miles = geocodeResult.distance_miles;
    }

    // Create or update customer record
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    let customerId: string;

    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          name,
          phone,
          address,
          latitude,
          longitude,
          distance_miles,
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating customer:', updateError);
        return NextResponse.json(
          { error: 'Failed to update customer information' },
          { status: 500 }
        );
      }

      customerId = updatedCustomer.id;
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabaseAdmin
        .from('customers')
        .insert({
          name,
          email,
          phone,
          address,
          latitude,
          longitude,
          distance_miles,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating customer:', createError);
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // Calculate total amount (in cents)
    const total_amount = num_rowers * 10000;

    // Create booking record
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        customer_id: customerId,
        date_id,
        num_rowers,
        payment_method,
        payment_status: 'pending',
        total_amount,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // If payment method is Stripe, create checkout session
    if (payment_method === 'stripe') {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Rent-a-Rower: ${num_rowers} rower${num_rowers > 1 ? 's' : ''} on ${new Date(dateData.date).toLocaleDateString()}`,
                  description: 'Michigan Men\'s Rowing Team — 4 hour labor session',
                },
                unit_amount: 10000, // $100 in cents
              },
              quantity: num_rowers,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/confirmation?booking_id=${booking.id}`,
          cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}`,
          metadata: {
            booking_id: booking.id,
          },
        });

        // Update booking with Stripe session ID
        await supabaseAdmin
          .from('bookings')
          .update({ stripe_payment_id: session.id })
          .eq('id', booking.id);

        // Send booking confirmation email
        await sendBookingConfirmation(email, {
          date: new Date(dateData.date).toLocaleDateString(),
          numRowers: num_rowers,
          total: total_amount,
          paymentMethod: 'stripe',
        });

        return NextResponse.json({
          booking_id: booking.id,
          checkout_url: session.url,
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to create payment session' },
          { status: 500 }
        );
      }
    }

    // For cash/check payments, send confirmation email and return booking ID
    await sendBookingConfirmation(email, {
      date: new Date(dateData.date).toLocaleDateString(),
      numRowers: num_rowers,
      total: total_amount,
      paymentMethod: 'cash_check',
    });

    return NextResponse.json({
      booking_id: booking.id,
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
