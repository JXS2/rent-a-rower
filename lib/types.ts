export interface Season {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface AvailableDate {
  id: string;
  season_id: string;
  date: string;
  bookings_open: boolean;
  created_at: string;
}

export interface Rower {
  id: string;
  season_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'rower' | 'coxswain';
  transportation: 'car' | 'bike' | 'none';
  committed_rars: number;
  token: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  distance_miles: number | null;
  created_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  date_id: string;
  num_rowers: number;
  payment_method: 'stripe' | 'cash_check';
  payment_status: 'pending' | 'paid' | 'refunded';
  stripe_payment_id: string | null;
  total_amount: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  // Joined
  customers?: Customer;
  available_dates?: AvailableDate;
}

export interface Assignment {
  id: string;
  booking_id: string;
  rower_id: string;
  status: 'assigned' | 'swap_pending' | 'completed';
  completed_by: string | null;
  created_at: string;
  // Joined
  rowers?: Rower;
  bookings?: Booking & { customers?: Customer; available_dates?: AvailableDate };
}

export interface Swap {
  id: string;
  assignment_id: string;
  original_rower_id: string;
  replacement_rower_id: string;
  replacement_token: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}
