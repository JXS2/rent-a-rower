'use client';

import { useState, useEffect } from 'react';
import { Assignment, Rower } from '@/lib/types';

interface AssignmentWithCrew extends Assignment {
  crewmates: Rower[];
}

interface RowerData {
  rower: Rower;
  assignments: AssignmentWithCrew[];
  completedCount: number;
}

export default function RowerPortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<RowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swapAssignmentId, setSwapAssignmentId] = useState<string | null>(null);
  const [availableRowers, setAvailableRowers] = useState<Rower[]>([]);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');
  const [swapLoading, setSwapLoading] = useState(false);

  useEffect(() => {
    loadRowerData();
  }, [params.token]);

  const loadRowerData = async () => {
    try {
      const res = await fetch(`/api/rower/${params.token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to load rower data');
        setLoading(false);
        return;
      }
      const rowerData = await res.json();
      setData(rowerData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load rower data');
      setLoading(false);
    }
  };

  const initiateSwap = async (assignmentId: string) => {
    setSwapAssignmentId(assignmentId);
    setSwapLoading(true);

    // Fetch all rowers in the season to populate dropdown
    try {
      const res = await fetch(`/api/rowers?season_id=${data?.rower.season_id}`);
      if (res.ok) {
        const rowers = await res.json();
        // Filter out the current rower
        const filtered = rowers.filter((r: Rower) => r.id !== data?.rower.id);
        setAvailableRowers(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch rowers:', err);
    }
    setSwapLoading(false);
  };

  const submitSwap = async () => {
    if (!selectedReplacementId || !swapAssignmentId) return;

    setSwapLoading(true);
    try {
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: swapAssignmentId,
          replacement_rower_id: selectedReplacementId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create swap');
        setSwapLoading(false);
        return;
      }

      alert('Swap request sent! The replacement rower will receive an email.');
      setSwapAssignmentId(null);
      setSelectedReplacementId('');
      loadRowerData(); // Reload to show swap_pending status
    } catch (err) {
      alert('Failed to create swap');
    }
    setSwapLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-xl text-red-600">{error || 'Rower not found'}</div>
      </div>
    );
  }

  const { rower, assignments, completedCount } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{rower.name}</h1>
          <p className="text-lg text-gray-600 mt-2">
            {completedCount} of {rower.committed_rars} committed RaRs completed
          </p>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Your Assignments</h2>
          </div>

          {assignments.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No assignments yet
            </div>
          ) : (
            <div className="divide-y">
              {assignments.map((assignment) => {
                const booking = assignment.bookings;
                const customer = booking?.customers;
                const date = booking?.available_dates?.date;
                const crewNames = assignment.crewmates.map(c => c.name);

                return (
                  <div key={assignment.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {date ? new Date(date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'Date TBD'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            assignment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : assignment.status === 'swap_pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {assignment.status === 'swap_pending' ? 'Swap Pending' :
                             assignment.status === 'completed' ? 'Completed' : 'Assigned'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-gray-600">
                          <p><strong>Customer:</strong> {customer?.name}</p>
                          <p><strong>Address:</strong> {customer?.address}</p>
                          {crewNames.length > 0 && (
                            <p><strong>Crew:</strong> {crewNames.join(', ')}</p>
                          )}
                        </div>
                      </div>

                      {assignment.status === 'assigned' && (
                        <button
                          onClick={() => initiateSwap(assignment.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                        >
                          Can't Make It
                        </button>
                      )}
                    </div>

                    {/* Swap Form */}
                    {swapAssignmentId === assignment.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
                        <h4 className="font-semibold mb-3">Request a swap</h4>
                        {swapLoading ? (
                          <p className="text-gray-600">Loading rowers...</p>
                        ) : (
                          <div className="flex gap-3">
                            <select
                              value={selectedReplacementId}
                              onChange={(e) => setSelectedReplacementId(e.target.value)}
                              className="flex-1 border border-gray-300 rounded px-3 py-2"
                            >
                              <option value="">Select a replacement rower</option>
                              {availableRowers.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.role})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={submitSwap}
                              disabled={!selectedReplacementId || swapLoading}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Send Request
                            </button>
                            <button
                              onClick={() => {
                                setSwapAssignmentId(null);
                                setSelectedReplacementId('');
                              }}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
