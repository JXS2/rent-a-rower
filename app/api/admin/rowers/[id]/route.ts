import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/admin/rowers/[id] - remove rower
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('rowers')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Rower deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/rowers/[id] - edit rower
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, phone, role, transportation, committed_rars } = body;

    // Build update object with only provided fields
    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone || null;
    if (role !== undefined) {
      if (role !== 'rower' && role !== 'coxswain') {
        return NextResponse.json(
          { error: 'Invalid role. Must be "rower" or "coxswain"' },
          { status: 400 }
        );
      }
      updates.role = role;
    }
    if (transportation !== undefined) {
      if (transportation !== 'car' && transportation !== 'bike' && transportation !== 'none') {
        return NextResponse.json(
          { error: 'Invalid transportation. Must be "car", "bike", or "none"' },
          { status: 400 }
        );
      }
      updates.transportation = transportation;
    }
    if (committed_rars !== undefined) {
      if (committed_rars < 1 || committed_rars > 8) {
        return NextResponse.json(
          { error: 'committed_rars must be between 1 and 8' },
          { status: 400 }
        );
      }
      updates.committed_rars = committed_rars;
    }

    const { data, error } = await supabaseAdmin
      .from('rowers')
      .update(updates)
      .eq('id', id)
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
