import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');

    if (!seasonId) {
      return NextResponse.json(
        { error: 'season_id is required' },
        { status: 400 }
      );
    }

    const { data: rowers, error } = await supabaseAdmin
      .from('rowers')
      .select('*')
      .eq('season_id', seasonId)
      .order('name');

    if (error) {
      console.error('Error fetching rowers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rowers' },
        { status: 500 }
      );
    }

    return NextResponse.json(rowers || []);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
