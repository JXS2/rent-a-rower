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

    if (seasonError) {
      return NextResponse.json(
        { error: 'Failed to fetch active season' },
        { status: 500 }
      );
    }

    if (!activeSeason) {
      return NextResponse.json({
        activeSeason: 'No active season',
        totalBookings: 0,
        totalRevenue: 0,
        revenueCollected: 0,
        revenueOutstanding: 0,
        upcomingDates: [],
      });
    }

    // Get all bookings for the active season
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(
        `
        *,
        available_dates!inner(season_id, date)
      `
      )
      .eq('available_dates.season_id', activeSeason.id);

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    const totalBookings = bookings?.length || 0;
    const totalRevenue =
      bookings?.reduce((sum, b) => sum + b.total_amount, 0) || 0;
    const revenueCollected =
      bookings
        ?.filter((b) => b.payment_status === 'paid')
        .reduce((sum, b) => sum + b.total_amount, 0) || 0;
    const revenueOutstanding = totalRevenue - revenueCollected;

    // Get upcoming dates with booking counts and assignment status
    const { data: dates, error: datesError } = await supabaseAdmin
      .from('available_dates')
      .select('*')
      .eq('season_id', activeSeason.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (datesError) {
      return NextResponse.json(
        { error: 'Failed to fetch dates' },
        { status: 500 }
      );
    }

    const upcomingDates = await Promise.all(
      (dates || []).map(async (date) => {
        // Get bookings for this date
        const { data: dateBookings } = await supabaseAdmin
          .from('bookings')
          .select('*')
          .eq('date_id', date.id);

        const bookingCount = dateBookings?.length || 0;
        const capacityRemaining = 0; // TODO: Calculate based on available rowers

        // Get assignments for this date
        const { data: assignments } = await supabaseAdmin
          .from('assignments')
          .select(
            `
            *,
            bookings!inner(date_id)
          `
          )
          .eq('bookings.date_id', date.id);

        let assignmentStatus = 'not run';
        if (assignments && assignments.length > 0) {
          // Check if notifications have been sent
          // For now, we'll assume if assignments exist, they're assigned
          // A more sophisticated system would track notification status
          assignmentStatus = 'assigned';
        }

        return {
          date: date.date,
          bookingCount,
          assignmentStatus,
          capacityRemaining,
        };
      })
    );

    return NextResponse.json({
      activeSeason: activeSeason.name,
      totalBookings,
      totalRevenue,
      revenueCollected,
      revenueOutstanding,
      upcomingDates,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
