import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get active season
    const { data: activeSeason, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .eq('active', true)
      .single();

    if (seasonError || !activeSeason) {
      return NextResponse.json({ dates: [] });
    }

    // Get all dates for active season where bookings are open
    const { data: dates, error: datesError } = await supabase
      .from('available_dates')
      .select('id, date')
      .eq('season_id', activeSeason.id)
      .eq('bookings_open', true)
      .order('date', { ascending: true });

    if (datesError) {
      console.error('Error fetching available dates:', datesError);
      return NextResponse.json(
        { error: 'Failed to fetch available dates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ dates: dates || [] });
  } catch (error) {
    console.error('Available dates fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
