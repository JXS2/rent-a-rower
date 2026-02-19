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

interface BookingSummary {
  count: number;
  totalRowers: number;
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
  const [runningAssignments, setRunningAssignments] = useState(false);
  const [notifyingRowers, setNotifyingRowers] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(
    null
  );

  useEffect(() => {
    fetchDates();
  }, []);

  useEffect(() => {
    if (selectedDateId) {
      fetchAssignments();
      fetchBookingSummary();
      setNotificationSent(false);
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

  async function fetchBookingSummary() {
    try {
      const response = await fetch(
        `/api/admin/bookings?date_id=${selectedDateId}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch booking summary');
      }
      const data = await response.json();
      const bookings = data.bookings || [];
      const summary = {
        count: bookings.length,
        totalRowers: bookings.reduce(
          (sum: number, b: any) => sum + b.num_rowers,
          0
        ),
      };
      setBookingSummary(summary);
    } catch (err) {
      console.error('Error fetching booking summary:', err);
      setBookingSummary(null);
    }
  }

  async function runAssignments() {
    if (
      assignmentGroups.length > 0 &&
      !confirm(
        'This will clear all current assignments for this date. Continue?'
      )
    ) {
      return;
    }

    setRunningAssignments(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/assignments/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_id: selectedDateId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run assignments');
      }

      const data = await response.json();

      // Show warnings if any
      if (data.warnings && data.warnings.length > 0) {
        alert('Warnings:\n' + data.warnings.join('\n'));
      }

      // Show unfilled bookings if any
      if (data.unfilled && data.unfilled.length > 0) {
        const unfilledMessages = data.unfilled.map(
          (u: any) =>
            `Booking ${u.bookingId}: ${u.assigned}/${u.needed} rowers assigned. ${u.reason || ''}`
        );
        alert('Unfilled bookings:\n' + unfilledMessages.join('\n'));
      }

      // Refresh assignments
      await fetchAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run assignments');
    } finally {
      setRunningAssignments(false);
    }
  }

  async function notifyRowers() {
    setNotifyingRowers(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/assignments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_id: selectedDateId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to notify rowers');
      }

      const data = await response.json();
      setNotificationSent(true);
      alert(`Successfully sent ${data.count || 0} notification emails`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify rowers');
    } finally {
      setNotifyingRowers(false);
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

        {/* Action Buttons */}
        {assignmentGroups.length === 0 && bookingSummary && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {bookingSummary.count} booking(s), {bookingSummary.totalRowers}{' '}
                  rower(s) needed
                </p>
              </div>
              <button
                onClick={runAssignments}
                disabled={runningAssignments || bookingSummary.count === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {runningAssignments ? 'Running...' : 'Run Assignments'}
              </button>
            </div>
          </div>
        )}

        {assignmentGroups.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={notifyRowers}
                disabled={notifyingRowers || notificationSent}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {notifyingRowers
                  ? 'Sending...'
                  : notificationSent
                  ? 'Notified'
                  : 'Notify Rowers'}
              </button>
              <button
                onClick={runAssignments}
                disabled={runningAssignments}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {runningAssignments ? 'Re-running...' : 'Re-run Assignments'}
              </button>
            </div>
          </div>
        )}

        {/* Assignments */}
        {assignmentGroups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
            No assignments found for this date
          </div>
        ) : (
          <div className="space-y-6">
            {assignmentGroups.map((group, index) => {
              const isUnfilled =
                group.assignments.length < group.booking.num_rowers;
              const unfilledCount =
                group.booking.num_rowers - group.assignments.length;
              const allCoxswains =
                group.assignments.length > 0 &&
                group.assignments.every(
                  (a) => a.rowers?.role === 'coxswain'
                );

              return (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow p-6 ${
                    isUnfilled ? 'border-2 border-red-300' : ''
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {group.booking.customer_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {group.booking.customer_address}
                        </p>
                        {group.booking.distance_miles !== null && (
                          <p className="text-sm text-gray-600">
                            Distance: {group.booking.distance_miles.toFixed(1)}{' '}
                            miles
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {group.booking.num_rowers} rower(s) needed
                        </p>
                      </div>
                      {isUnfilled && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                          Needs {unfilledCount} more{' '}
                          {unfilledCount === 1 ? 'rower' : 'rowers'}
                        </span>
                      )}
                    </div>

                    {allCoxswains && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Warning: All assigned crew members are coxswains
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Assigned Rowers ({group.assignments.length}/
                      {group.booking.num_rowers}):
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
                              <span className="capitalize">
                                {assignment.rowers?.role || 'N/A'}
                              </span>{' '}
                              |{' '}
                              <span className="capitalize">
                                {assignment.rowers?.transportation || 'N/A'}
                              </span>
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
                    {isUnfilled && (
                      <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                        <p className="text-sm font-semibold text-red-800">
                          Unfilled: {group.assignments.length} of{' '}
                          {group.booking.num_rowers} rowers assigned
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
