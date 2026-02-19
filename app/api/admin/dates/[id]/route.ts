import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { bookings_open } = await request.json();

    if (typeof bookings_open !== 'boolean') {
      return NextResponse.json(
        { error: 'bookings_open must be a boolean value' },
        { status: 400 }
      );
    }

    const { data: updatedDate, error } = await supabaseAdmin
      .from('available_dates')
      .update({ bookings_open })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating date:', error);
      return NextResponse.json(
        { error: 'Failed to update date' },
        { status: 500 }
      );
    }

    if (!updatedDate) {
      return NextResponse.json(
        { error: 'Date not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ date: updatedDate });
  } catch (error) {
    console.error('Date update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
