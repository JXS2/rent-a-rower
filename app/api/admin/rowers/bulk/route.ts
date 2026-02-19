import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/rowers/bulk - CSV bulk upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rowers } = body;

    if (!rowers || !Array.isArray(rowers) || rowers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid rowers array' },
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

    // Validate each rower
    for (const rower of rowers) {
      if (!rower.name || !rower.email || !rower.role || !rower.transportation || !rower.committed_rars || !rower.token) {
        return NextResponse.json(
          { error: 'Each rower must have name, email, role, transportation, committed_rars, and token' },
          { status: 400 }
        );
      }

      if (rower.role !== 'rower' && rower.role !== 'coxswain') {
        return NextResponse.json(
          { error: `Invalid role for ${rower.name}. Must be "rower" or "coxswain"` },
          { status: 400 }
        );
      }

      if (rower.transportation !== 'car' && rower.transportation !== 'bike' && rower.transportation !== 'none') {
        return NextResponse.json(
          { error: `Invalid transportation for ${rower.name}. Must be "car", "bike", or "none"` },
          { status: 400 }
        );
      }

      if (rower.committed_rars < 1 || rower.committed_rars > 8) {
        return NextResponse.json(
          { error: `committed_rars for ${rower.name} must be between 1 and 8` },
          { status: 400 }
        );
      }
    }

    // Prepare rowers for insert
    const rowersToInsert = rowers.map((rower) => ({
      season_id: season.id,
      name: rower.name,
      email: rower.email,
      phone: rower.phone || null,
      role: rower.role,
      transportation: rower.transportation,
      committed_rars: rower.committed_rars,
      token: rower.token,
    }));

    // Bulk insert
    const { data, error } = await supabaseAdmin
      .from('rowers')
      .insert(rowersToInsert)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: `Successfully added ${data.length} rowers`,
      rowers: data,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
