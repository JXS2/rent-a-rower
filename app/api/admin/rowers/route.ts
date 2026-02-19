import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/rowers - list all rowers with completion counts
export async function GET(request: NextRequest) {
  try {
    // Get active season
    const { data: seasons, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('active', true)
      .single();

    if (seasonError || !seasons) {
      return NextResponse.json(
        { error: 'No active season found' },
        { status: 400 }
      );
    }

    // Get all rowers for the active season
    const { data: rowers, error: rowersError } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('season_id', seasons.id)
      .order('name', { ascending: true });

    if (rowersError) {
      throw rowersError;
    }

    // For each rower, count completed assignments
    const rowersWithCompletions = await Promise.all(
      (rowers || []).map(async (rower) => {
        const { data: completedAssignments } = await supabaseAdmin
          .from('assignments')
          .select('*')
          .eq('completed_by', rower.id)
          .eq('status', 'completed');

        return {
          ...rower,
          completed_count: completedAssignments?.length || 0,
        };
      })
    );

    return NextResponse.json({ rowers: rowersWithCompletions });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/rowers - add single rower
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, role, transportation, committed_rars, token } = body;

    // Validate required fields
    if (!name || !email || !role || !transportation || !committed_rars || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== 'rower' && role !== 'coxswain') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "rower" or "coxswain"' },
        { status: 400 }
      );
    }

    // Validate transportation
    if (transportation !== 'car' && transportation !== 'bike' && transportation !== 'none') {
      return NextResponse.json(
        { error: 'Invalid transportation. Must be "car", "bike", or "none"' },
        { status: 400 }
      );
    }

    // Validate committed_rars
    if (committed_rars < 1 || committed_rars > 8) {
      return NextResponse.json(
        { error: 'committed_rars must be between 1 and 8' },
        { status: 400 }
      );
    }

    // Get active season
    const { data: season, error: seasonError } = await supabaseAdmin
      .from('seasons')
      .select('*')
      .eq('active', true)
      .single();

    if (seasonError || !season) {
      return NextResponse.json(
        { error: 'No active season found' },
        { status: 400 }
      );
    }

    // Insert rower
    const { data, error } = await supabaseAdmin
      .from('rowers')
      .insert({
        season_id: season.id,
        name,
        email,
        phone: phone || null,
        role,
        transportation,
        committed_rars,
        token,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ rower: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
