import { NextResponse } from 'next/server';
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

    // Get all dates for active season
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

    return NextResponse.json({ dates: dates || [] });
  } catch (error) {
    console.error('Dates fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
