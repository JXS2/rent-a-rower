'use client';

import { useState, useEffect } from 'react';

interface AvailableDate {
  id: string;
  date: string;
}

export default function Home() {
  const [dates, setDates] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<AvailableDate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    num_rowers: 1,
    payment_method: 'cash_check',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  const fetchAvailableDates = async () => {
    try {
      const response = await fetch('/api/dates/available');
      const data = await response.json();
      setDates(data.dates || []);
    } catch (err) {
      console.error('Failed to fetch dates:', err);
      setError('Failed to load available dates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          date_id: selectedDate?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create booking');
        setSubmitting(false);
        return;
      }

      // If Stripe payment, redirect to checkout
      if (formData.payment_method === 'stripe' && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        // For cash/check, redirect to confirmation
        window.location.href = `/confirmation?booking_id=${data.booking_id}`;
      }
    } catch (err) {
      console.error('Booking error:', err);
      setError('Failed to create booking. Please try again.');
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Michigan Men's Rowing — Rent-a-Rower
          </h1>
          <p className="text-lg text-gray-700">
            Reserve team members for 4 hours of yard work, moving help, or any labor you need. $100 per rower.
          </p>
        </div>

        {/* Available Dates */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Date</h2>

          {loading ? (
            <p className="text-gray-600">Loading available dates...</p>
          ) : dates.length === 0 ? (
            <p className="text-gray-600">No dates currently available — check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dates.map((date) => (
                <button
                  key={date.id}
                  onClick={() => setSelectedDate(date)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedDate?.id === date.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 bg-white'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{formatDate(date.date)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Booking Form */}
        {selectedDate && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>
            <p className="text-sm text-gray-600 mb-6">
              Selected date: <span className="font-medium">{formatDate(selectedDate.date)}</span>
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Full address where work will be performed"
                />
              </div>

              {/* Number of Rowers */}
              <div>
                <label htmlFor="num_rowers" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Rowers Needed *
                </label>
                <select
                  id="num_rowers"
                  required
                  value={formData.num_rowers}
                  onChange={(e) => setFormData({ ...formData, num_rowers: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} rower{num > 1 ? 's' : ''} (${num * 100})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash_check"
                      checked={formData.payment_method === 'cash_check'}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="mr-3"
                    />
                    <span className="text-gray-900">Pay by Cash/Check</span>
                  </label>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center text-gray-500">
                      <input
                        type="radio"
                        name="payment_method"
                        value="stripe"
                        disabled
                        className="mr-3"
                      />
                      <span>Pay Online (Credit/Debit Card) - Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Processing...' : 'Complete Booking'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
