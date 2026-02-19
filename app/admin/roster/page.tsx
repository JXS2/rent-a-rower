'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import type { Rower } from '@/lib/types';

interface RowerWithCompletions extends Rower {
  completed_count: number;
}

export default function RosterPage() {
  const [rowers, setRowers] = useState<RowerWithCompletions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);

  // Manual add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingRower, setIsAddingRower] = useState(false);
  const [newRower, setNewRower] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'rower' as 'rower' | 'coxswain',
    transportation: 'none' as 'car' | 'bike' | 'none',
    committed_rars: 1,
  });

  // Edit state
  const [editingRower, setEditingRower] = useState<RowerWithCompletions | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchRowers();
  }, []);

  async function fetchRowers() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/rowers');
      if (!response.ok) {
        throw new Error('Failed to fetch rowers');
      }
      const data = await response.json();
      setRowers(data.rowers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleCSVUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) return;

    setIsUploadingCSV(true);
    try {
      const csvText = await csvFile.text();
      const parsedRowers = parseCSV(csvText);

      // Add tokens to each rower
      const rowersWithTokens = parsedRowers.map((rower) => ({
        ...rower,
        token: nanoid(12),
      }));

      const response = await fetch('/api/admin/rowers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowers: rowersWithTokens }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload CSV');
      }

      setCsvFile(null);
      await fetchRowers();
      alert('CSV uploaded successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setIsUploadingCSV(false);
    }
  }

  function parseCSV(csvText: string) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });
      return {
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        role: row.role as 'rower' | 'coxswain',
        transportation: row.transportation as 'car' | 'bike' | 'none',
        committed_rars: parseInt(row.committed_rars) || 1,
      };
    });
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();

    setIsAddingRower(true);
    try {
      const response = await fetch('/api/admin/rowers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRower,
          token: nanoid(12),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add rower');
      }

      setNewRower({
        name: '',
        email: '',
        phone: '',
        role: 'rower',
        transportation: 'none',
        committed_rars: 1,
      });
      setShowAddForm(false);
      await fetchRowers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add rower');
    } finally {
      setIsAddingRower(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRower) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/rowers/${editingRower.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingRower.name,
          email: editingRower.email,
          phone: editingRower.phone,
          role: editingRower.role,
          transportation: editingRower.transportation,
          committed_rars: editingRower.committed_rars,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update rower');
      }

      setEditingRower(null);
      await fetchRowers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update rower');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(rowerId: string, rowerName: string) {
    if (!confirm(`Are you sure you want to delete ${rowerName}?`)) return;

    try {
      const response = await fetch(`/api/admin/rowers/${rowerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete rower');
      }

      await fetchRowers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rower');
    }
  }

  const getPortalLink = (token: string) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${siteUrl}/rower/${token}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading roster...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Team Roster</h1>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* CSV Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Roster via CSV
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            CSV must have columns: name, email, phone, role, transportation,
            committed_rars
          </p>
          <form onSubmit={handleCSVUpload} className="flex gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isUploadingCSV}
            />
            <button
              type="submit"
              disabled={isUploadingCSV || !csvFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploadingCSV ? 'Uploading...' : 'Upload CSV'}
            </button>
          </form>
        </div>

        {/* Manual Add Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Add Rower Manually
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showAddForm ? 'Cancel' : 'Add Rower'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newRower.name}
                    onChange={(e) =>
                      setNewRower({ ...newRower, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newRower.email}
                    onChange={(e) =>
                      setNewRower({ ...newRower, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newRower.phone}
                    onChange={(e) =>
                      setNewRower({ ...newRower, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newRower.role}
                    onChange={(e) =>
                      setNewRower({
                        ...newRower,
                        role: e.target.value as 'rower' | 'coxswain',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rower">Rower</option>
                    <option value="coxswain">Coxswain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transportation
                  </label>
                  <select
                    value={newRower.transportation}
                    onChange={(e) =>
                      setNewRower({
                        ...newRower,
                        transportation: e.target.value as
                          | 'car'
                          | 'bike'
                          | 'none',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Committed RaRs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newRower.committed_rars}
                    onChange={(e) =>
                      setNewRower({
                        ...newRower,
                        committed_rars: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isAddingRower}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isAddingRower ? 'Adding...' : 'Add Rower'}
              </button>
            </form>
          )}
        </div>

        {/* Roster Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Roster
          </h2>
          {rowers.length === 0 ? (
            <p className="text-gray-600">No rowers added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transportation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Committed RaRs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed RaRs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Portal Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rowers.map((rower) => (
                    <tr key={rower.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rower.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rower.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rower.transportation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rower.committed_rars}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rower.completed_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={getPortalLink(rower.token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View Portal
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => setEditingRower(rower)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rower.id, rower.name)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingRower && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Edit Rower
              </h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editingRower.name}
                      onChange={(e) =>
                        setEditingRower({
                          ...editingRower,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingRower.email}
                      onChange={(e) =>
                        setEditingRower({
                          ...editingRower,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editingRower.phone || ''}
                      onChange={(e) =>
                        setEditingRower({
                          ...editingRower,
                          phone: e.target.value || null,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editingRower.role}
                      onChange={(e) =>
                        setEditingRower({
                          ...editingRower,
                          role: e.target.value as 'rower' | 'coxswain',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="rower">Rower</option>
                      <option value="coxswain">Coxswain</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transportation
                    </label>
                    <select
                      value={editingRower.transportation}
                      onChange={(e) =>
                        setEditingRower({
                          ...editingRower,
                          transportation: e.target.value as
                            | 'car'
                            | 'bike'
                            | 'none',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="none">None</option>
                      <option value="bike">Bike</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Committed RaRs
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={editingRower.committed_rars}
                      onChange={(e) =>
                        setEditingRower({
                          ...editingRower,
                          committed_rars: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUpdating ? 'Updating...' : 'Update Rower'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRower(null)}
                    className="flex-1 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
