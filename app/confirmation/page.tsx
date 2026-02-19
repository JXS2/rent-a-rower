import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

interface ConfirmationPageProps {
  searchParams: {
    booking_id?: string;
  };
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const bookingId = searchParams.booking_id;

  // If no booking ID, show error
  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Booking Not Found
          </h1>
          <p className="text-gray-700 mb-6">
            No booking ID was provided. Please check your confirmation link.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Fetch booking details from database
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      customers (*),
      available_dates (*)
    `)
    .eq('id', bookingId)
    .single();

  // If booking not found, show error
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Booking Not Found
          </h1>
          <p className="text-gray-700 mb-6">
            We couldn't find a booking with that ID. Please contact us if you believe this is an error.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Format the date nicely
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Convert total_amount from cents to dollars
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Determine payment status message
  const getPaymentStatusMessage = () => {
    if (booking.payment_status === 'paid') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">
            Paid — thank you!
          </p>
        </div>
      );
    } else {
      // Payment pending
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-semibold mb-2">
            Payment pending
          </p>
          <p className="text-yellow-700 text-sm">
            Please deliver cash or check to the team. You will receive payment instructions via email.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">
            Thank you for booking with Michigan Men's Rowing
          </p>
        </div>

        {/* Booking Details */}
        <div className="space-y-6">
          {/* Date */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">
              Date
            </h2>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(booking.available_dates.date)}
            </p>
          </div>

          {/* Number of Rowers */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">
              Number of Rowers Reserved
            </h2>
            <p className="text-lg font-semibold text-gray-900">
              {booking.num_rowers} rower{booking.num_rowers > 1 ? 's' : ''}
            </p>
          </div>

          {/* Total Cost */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">
              Total Cost
            </h2>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(booking.total_amount)}
            </p>
          </div>

          {/* Payment Status */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">
              Payment Status
            </h2>
            {getPaymentStatusMessage()}
          </div>

          {/* Email Confirmation Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              You'll receive a confirmation email shortly at{' '}
              <span className="font-semibold">{booking.customers.email}</span>
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="block w-full text-center bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
