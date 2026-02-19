'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Assignment } from '@/lib/types';

interface AssignmentGroup {
  booking: {
    id: string;
    customer_name: string;
    customer_address: string;
    distance_miles: number | null;
    num_rowers: number;
  };
  assignments: Assignment[];
}

export default function AssignmentsPage() {
  const [dates, setDates] = useState<{ id: string; date: string }[]>([]);
  const [selectedDateId, setSelectedDateId] = useState('');
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState<string | null>(
    null
  );
  const [processingCompleteAll, setProcessingCompleteAll] = useState(false);

  useEffect(() => {
    fetchDates();
  }, []);

  useEffect(() => {
    if (selectedDateId) {
      fetchAssignments();
    }
  }, [selectedDateId]);

  async function fetchDates() {
    try {
      const response = await fetch('/api/admin/dates');
      if (!response.ok) {
        throw new Error('Failed to fetch dates');
      }
      const data = await response.json();
      setDates(data.dates || []);
      if (data.dates && data.dates.length > 0) {
        setSelectedDateId(data.dates[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssignments() {
    try {
      const response = await fetch(
        `/api/admin/assignments?date_id=${selectedDateId}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const data = await response.json();
      setAssignmentGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  async function markComplete(assignmentId: string, completed: boolean) {
    setProcessingComplete(assignmentId);
    try {
      const response = await fetch(
        `/api/admin/assignments/${assignmentId}/complete`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }

      await fetchAssignments();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to update assignment'
      );
    } finally {
      setProcessingComplete(null);
    }
  }

  async function markAllComplete() {
    if (
      !confirm(
        'Are you sure you want to mark all assignments for this date as complete?'
      )
    ) {
      return;
    }

    setProcessingCompleteAll(true);
    try {
      const response = await fetch('/api/admin/assignments/complete-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_id: selectedDateId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as complete');
      }

      await fetchAssignments();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to mark all as complete'
      );
    } finally {
      setProcessingCompleteAll(false);
    }
  }

  const selectedDate = dates.find((d) => d.id === selectedDateId);
  const isPastDate = selectedDate
    ? new Date(selectedDate.date) < new Date()
    : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading assignments...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Select Date:
            </label>
            <select
              value={selectedDateId}
              onChange={(e) => setSelectedDateId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {dates.map((date) => (
                <option key={date.id} value={date.id}>
                  {new Date(date.date).toLocaleDateString()}
                </option>
              ))}
            </select>
            {isPastDate && assignmentGroups.length > 0 && (
              <button
                onClick={markAllComplete}
                disabled={processingCompleteAll}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {processingCompleteAll
                  ? 'Processing...'
                  : 'Mark All Complete'}
              </button>
            )}
          </div>
        </div>

        {/* Assignments */}
        {assignmentGroups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            No assignments found for this date
          </div>
        ) : (
          <div className="space-y-6">
            {assignmentGroups.map((group, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {group.booking.customer_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {group.booking.customer_address}
                  </p>
                  {group.booking.distance_miles !== null && (
                    <p className="text-sm text-gray-600">
                      Distance: {group.booking.distance_miles.toFixed(1)} miles
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    {group.booking.num_rowers} rower(s) needed
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Assigned Rowers:
                  </h4>
                  {group.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isPastDate && (
                          <input
                            type="checkbox"
                            checked={assignment.status === 'completed'}
                            onChange={(e) =>
                              markComplete(assignment.id, e.target.checked)
                            }
                            disabled={processingComplete === assignment.id}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.rowers?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {assignment.rowers?.role || 'N/A'} |{' '}
                            {assignment.rowers?.transportation || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            assignment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : assignment.status === 'swap_pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {group.assignments.length < group.booking.num_rowers && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ⚠️ Unfilled: {group.assignments.length} of{' '}
                        {group.booking.num_rowers} rowers assigned
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
