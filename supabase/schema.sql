-- Rent-a-Rower Database Schema
-- Run these statements in order in Supabase SQL Editor

-- 1. Seasons Table
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Available Dates Table
CREATE TABLE available_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bookings_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, date)
);

-- 3. Rowers Table
CREATE TABLE rowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('rower', 'coxswain')),
  transportation TEXT NOT NULL CHECK (transportation IN ('car', 'bike', 'none')),
  committed_rars INTEGER NOT NULL CHECK (committed_rars BETWEEN 1 AND 8),
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Bookings Table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  date_id UUID REFERENCES available_dates(id),
  num_rowers INTEGER NOT NULL CHECK (num_rowers >= 1),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cash_check')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_id TEXT,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Assignments Table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  rower_id UUID REFERENCES rowers(id),
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'swap_pending', 'completed')),
  completed_by UUID REFERENCES rowers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Swaps Table
CREATE TABLE swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  original_rower_id UUID REFERENCES rowers(id),
  replacement_rower_id UUID REFERENCES rowers(id),
  replacement_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_bookings_date_id ON bookings(date_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_assignments_booking_id ON assignments(booking_id);
CREATE INDEX idx_assignments_rower_id ON assignments(rower_id);
CREATE INDEX idx_swaps_assignment_id ON swaps(assignment_id);
CREATE INDEX idx_rowers_season_id ON rowers(season_id);
CREATE INDEX idx_rowers_token ON rowers(token);
CREATE INDEX idx_swaps_token ON swaps(replacement_token);
CREATE INDEX idx_available_dates_season_id ON available_dates(season_id);

-- Campus center reference point for distance calculations:
-- University of Michigan Central Campus: (42.2780, -83.7382)
