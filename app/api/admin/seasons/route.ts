import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Season name is required' },
        { status: 400 }
      );
    }

    // Deactivate all existing seasons
    const { error: deactivateError } = await supabaseAdmin
      .from('seasons')
      .update({ active: false })
      .eq('active', true);

    if (deactivateError) {
      console.error('Error deactivating seasons:', deactivateError);
      return NextResponse.json(
        { error: 'Failed to deactivate existing seasons' },
        { status: 500 }
      );
    }

    // Create new active season
    const { data: season, error: createError } = await supabaseAdmin
      .from('seasons')
      .insert({ name: name.trim(), active: true })
      .select()
      .single();

    if (createError) {
      console.error('Error creating season:', createError);
      return NextResponse.json(
        { error: 'Failed to create season' },
        { status: 500 }
      );
    }

    return NextResponse.json({ season });
  } catch (error) {
    console.error('Season creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data: seasons, error } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch seasons' },
        { status: 500 }
      );
    }

    return NextResponse.json({ seasons: seasons || [] });
  } catch (error) {
    console.error('Seasons fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
