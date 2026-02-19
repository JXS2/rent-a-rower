'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Season, AvailableDate } from '@/lib/types';

interface DateWithStats extends AvailableDate {
  total_bookings: number;
  total_rowers: number;
}

export default function DatesPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dates, setDates] = useState<DateWithStats[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [isAddingDate, setIsAddingDate] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      await Promise.all([fetchSeasons(), fetchDates()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSeasons() {
    const response = await fetch('/api/admin/seasons');
    if (!response.ok) {
      throw new Error('Failed to fetch seasons');
    }
    const data = await response.json();
    setSeasons(data.seasons || []);
    const active = data.seasons?.find((s: Season) => s.active);
    setActiveSeason(active || null);
  }

  async function fetchDates() {
    const response = await fetch('/api/admin/dates');
    if (!response.ok) {
      throw new Error('Failed to fetch dates');
    }
    const data = await response.json();
    setDates(data.dates || []);
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeasonName.trim()) return;

    setIsCreatingSeason(true);
    try {
      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSeasonName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create season');
      }

      setNewSeasonName('');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create season');
    } finally {
      setIsCreatingSeason(false);
    }
  }

  async function handleAddDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !activeSeason) return;

    setIsAddingDate(true);
    try {
      const response = await fetch('/api/admin/dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: activeSeason.id,
          date: newDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add date');
      }

      setNewDate('');
      await fetchDates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add date');
    } finally {
      setIsAddingDate(false);
    }
  }

  async function handleToggleBookingsOpen(dateId: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/admin/dates/${dateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings_open: !currentValue }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update date');
      }

      await fetchDates();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update date');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading dates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Season & Date Management
          </h1>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Create New Season */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create New Season
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Creating a new season will automatically deactivate the current active
            season.
          </p>
          <form onSubmit={handleCreateSeason} className="flex gap-4">
            <input
              type="text"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              placeholder="e.g., Winter 2026"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreatingSeason}
            />
            <button
              type="submit"
              disabled={isCreatingSeason || !newSeasonName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingSeason ? 'Creating...' : 'Create Season'}
            </button>
          </form>
        </div>

        {/* Seasons List */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Seasons</h2>
          {seasons.length === 0 ? (
            <p className="text-gray-600">No seasons created yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seasons.map((season) => (
                    <tr key={season.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {season.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {season.active ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(season.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Date to Active Season */}
        {activeSeason ? (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Add Date to {activeSeason.name}
              </h2>
              <form onSubmit={handleAddDate} className="flex gap-4">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isAddingDate}
                />
                <button
                  type="submit"
                  disabled={isAddingDate || !newDate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isAddingDate ? 'Adding...' : 'Add Date'}
                </button>
              </form>
            </div>

            {/* Dates List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Available Dates for {activeSeason.name}
              </h2>
              {/*
                Note: Remaining Capacity calculation will be implemented after roster management (Task 3).
                Capacity calculation logic:
                - For each date: Sum of (rower.committed_rars - completed_jobs - pending_jobs) for all active rowers
                - Remaining capacity = total capacity - total_rowers already booked for that date
              */}
              {dates.length === 0 ? (
                <p className="text-gray-600">No dates added yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bookings Open
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Bookings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Rowers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dates.map((date) => (
                        <tr key={date.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(date.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={date.bookings_open}
                                onChange={() =>
                                  handleToggleBookingsOpen(
                                    date.id,
                                    date.bookings_open
                                  )
                                }
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-gray-700">
                                {date.bookings_open ? 'Open' : 'Closed'}
                              </span>
                            </label>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {date.total_bookings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {date.total_rowers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            —
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            -
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              No active season. Please create a season first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
