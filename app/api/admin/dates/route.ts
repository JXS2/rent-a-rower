import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get active season
    const { data: activeSeason, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('active', true)
      .single();

    if (seasonError || !activeSeason) {
      return NextResponse.json({ dates: [] });
    }

    // Get all dates for active season with booking stats
    const { data: dates, error: datesError } = await supabaseAdmin
      .from('available_dates')
      .select('*')
      .eq('season_id', activeSeason.id)
      .order('date', { ascending: true });

    if (datesError) {
      console.error('Error fetching dates:', datesError);
      return NextResponse.json(
        { error: 'Failed to fetch dates' },
        { status: 500 }
      );
    }

    // Get booking stats for each date
    const datesWithStats = await Promise.all(
      (dates || []).map(async (date) => {
        const { data: bookings, error: bookingsError } = await supabaseAdmin
          .from('bookings')
          .select('num_rowers')
          .eq('date_id', date.id)
          .neq('status', 'cancelled');

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          return {
            ...date,
            total_bookings: 0,
            total_rowers: 0,
          };
        }

        const totalBookings = bookings?.length || 0;
        const totalRowers = bookings?.reduce((sum, b) => sum + b.num_rowers, 0) || 0;

        return {
          ...date,
          total_bookings: totalBookings,
          total_rowers: totalRowers,
        };
      })
    );

    return NextResponse.json({ dates: datesWithStats });
  } catch (error) {
    console.error('Dates fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { season_id, date } = await request.json();

    if (!season_id || !date) {
      return NextResponse.json(
        { error: 'Season ID and date are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Insert the date
    const { data: newDate, error: insertError } = await supabaseAdmin
      .from('available_dates')
      .insert({
        season_id,
        date,
        bookings_open: true,
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'This date already exists for this season' },
          { status: 409 }
        );
      }
      console.error('Error creating date:', insertError);
      return NextResponse.json(
        { error: 'Failed to create date' },
        { status: 500 }
      );
    }

    return NextResponse.json({ date: newDate });
  } catch (error) {
    console.error('Date creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
