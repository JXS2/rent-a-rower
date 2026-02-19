import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('date_id');

    let query = supabaseAdmin
      .from('bookings')
      .select(
        `
        *,
        customers(*),
        available_dates(*)
      `
      );

    // Filter by date_id if provided
    if (dateId) {
      query = query.eq('date_id', dateId);
    }

    const { data: bookings, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
