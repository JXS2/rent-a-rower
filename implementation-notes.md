# Implementation Notes & Pitfalls

This file supplements `spec.md` with specific implementation patterns that must be followed. Read this BEFORE writing any code.

---

## 1. Package Versions & Imports

### nanoid
Use nanoid v3 (CommonJS compatible with Next.js):
```bash
npm install nanoid@3
```
```typescript
import { nanoid } from 'nanoid';
const token = nanoid(12); // 12-char token for rowers
const swapToken = nanoid(16); // 16-char token for swaps
```
Do NOT use nanoid v5+ as it is ESM-only and causes issues with Next.js server components.

### Supabase Client Setup
Create TWO clients in `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

// Public client — used in client components and public API routes
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server client — used in server-side API routes and server components
// This bypasses Row Level Security
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Use `supabaseAdmin` for ALL API route handlers (server-side). Use `supabase` (public client) only if you need client-side reads.

---

## 2. Next.js 14 App Router Patterns

### API Routes
All API routes go in `app/api/`. Use the Route Handler pattern:

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'hello' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ success: true });
}
```

### Dynamic Route Parameters
For routes like `/api/admin/assignments/[id]/complete`:

```typescript
// app/api/admin/assignments/[id]/complete/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // ...
}
```

### Middleware
```typescript
// middleware.ts (project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect /admin routes (but not /api/admin/login)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token')?.value;
    if (!token || token !== process.env.ADMIN_PASSWORD) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

Note: The login page should be at `/login` (outside /admin) so it's not protected by middleware. The API route `/api/admin/login` also needs to be excluded — put login logic in `/api/auth/login/route.ts` instead, or add an exception in the middleware matcher.

---

## 3. Stripe Webhook — Raw Body Handling

Stripe webhook verification requires the raw request body. In Next.js App Router, you must handle this carefully:

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text(); // RAW text, not .json()
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // Update booking payment_status to 'paid'
    // The booking_id should be stored in session.metadata.booking_id
  }

  return NextResponse.json({ received: true });
}
```

When creating the Checkout Session, pass booking_id in metadata:
```typescript
const session = await stripe.checkout.sessions.create({
  line_items: [{ price_data: { currency: 'usd', product_data: { name: `Rent-a-Rower: ${numRowers} rowers on ${date}` }, unit_amount: 10000 }, quantity: numRowers }],
  mode: 'payment',
  success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/confirmation?booking_id=${bookingId}`,
  cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}`,
  metadata: { booking_id: bookingId }
});
```

---

## 4. CSV Parsing for Roster Upload

Do NOT use an external library. Parse CSV manually since the format is simple and known:

```typescript
function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}
```

Expected CSV columns: `name, email, phone, role, transportation, committed_rars`

On the admin roster page, add a file input that reads the CSV client-side, parses it, and sends the array to `POST /api/admin/rowers/bulk`.

---

## 5. Resend Email Setup

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Use a simple from address — Resend's free tier lets you send from onboarding@resend.dev
const FROM_EMAIL = 'Rent-a-Rower <onboarding@resend.dev>';

export async function sendBookingConfirmation(to: string, booking: { date: string; numRowers: number; total: number; paymentMethod: string }) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Rent-a-Rower Booking Confirmation — ${booking.date}`,
    html: `
      <h2>Booking Confirmed!</h2>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Rowers:</strong> ${booking.numRowers}</p>
      <p><strong>Total:</strong> $${booking.total / 100}</p>
      <p><strong>Payment:</strong> ${booking.paymentMethod === 'stripe' ? 'Paid online' : 'Cash/check — please deliver payment'}</p>
    `
  });
}

export async function sendAssignmentNotification(to: string, assignment: { date: string; customerName: string; address: string; crewMembers: string[]; portalUrl: string }) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Rent-a-Rower Assignment — ${assignment.date}`,
    html: `
      <h2>You've been assigned a Rent-a-Rower job!</h2>
      <p><strong>Date:</strong> ${assignment.date}</p>
      <p><strong>Customer:</strong> ${assignment.customerName}</p>
      <p><strong>Address:</strong> ${assignment.address}</p>
      <p><strong>Your crew:</strong> ${assignment.crewMembers.join(', ')}</p>
      <p><a href="${assignment.portalUrl}">View your assignments</a></p>
    `
  });
}

export async function sendSwapRequest(to: string, swap: { requesterName: string; date: string; customerName: string; address: string; acceptUrl: string; declineUrl: string }) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Swap Request — Rent-a-Rower on ${swap.date}`,
    html: `
      <h2>${swap.requesterName} needs you to cover a Rent-a-Rower</h2>
      <p><strong>Date:</strong> ${swap.date}</p>
      <p><strong>Customer:</strong> ${swap.customerName}</p>
      <p><strong>Address:</strong> ${swap.address}</p>
      <p><a href="${swap.acceptUrl}">Accept</a> | <a href="${swap.declineUrl}">Decline</a></p>
    `
  });
}
```

---

## 6. Admin Auth — Simple Approach

Don't overcomplicate this. The simplest working approach:

1. Login page at `/login` (outside /admin, so middleware doesn't block it)
2. Login form POSTs to `/api/auth/login`
3. API route checks password against `ADMIN_PASSWORD` env var
4. On success, sets a cookie: `admin_token` with the value of `ADMIN_PASSWORD` (this is fine for a simple internal tool)
5. Middleware checks if `admin_token` cookie matches `ADMIN_PASSWORD`
6. Logout just clears the cookie

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', process.env.ADMIN_PASSWORD!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return response;
}
```

---

## 7. Page Component Pattern

All pages should be server components by default. Use 'use client' only when the page needs interactivity (forms, state, click handlers). Most admin pages will need 'use client'.

```typescript
// Typical admin page pattern
'use client';

import { useState, useEffect } from 'react';

export default function AdminRosterPage() {
  const [rowers, setRowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/rowers')
      .then(res => res.json())
      .then(data => { setRowers(data); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Team Roster</h1>
      {/* ... */}
    </div>
  );
}
```

---

## 8. Database Query Patterns

Always use the Supabase JS client, not raw SQL in the application code:

```typescript
// Insert
const { data, error } = await supabaseAdmin
  .from('rowers')
  .insert({ name, email, phone, role, transportation, committed_rars, token: nanoid(12), season_id })
  .select()
  .single();

// Select with join
const { data, error } = await supabaseAdmin
  .from('bookings')
  .select('*, customers(*), available_dates(*)')
  .eq('date_id', dateId);

// Update
const { error } = await supabaseAdmin
  .from('assignments')
  .update({ rower_id: newRowerId })
  .eq('id', assignmentId);

// Count/aggregate for rower completion
const { data, error } = await supabaseAdmin
  .from('assignments')
  .select('*')
  .eq('completed_by', rowerId)
  .eq('status', 'completed');
// completed count = data.length
```

---

## 9. Assignment Algorithm — Additional Edge Cases

Handle these explicitly in `lib/assignment.ts`:

1. **No available rowers:** Return early with all bookings marked as unfilled.
2. **More rowers requested than available:** Fill as many bookings as possible (largest first), flag the rest.
3. **No drivers available but car-required job exists:** Flag the job — don't assign pedestrians to far jobs.
4. **A single-person job:** Must be a rower (not coxswain). If only coxswains are available, flag it.
5. **All rowers have fulfilled their commitments:** Return all bookings as unfilled.

The algorithm should return a structured result:
```typescript
interface AssignmentResult {
  assignments: { bookingId: string; rowerId: string }[];
  unfilled: { bookingId: string; needed: number; assigned: number; reason: string }[];
  warnings: string[];
}
```

---

## 10. Navigation

Add a simple nav bar to all admin pages:

```typescript
// components/AdminNav.tsx
'use client';
import Link from 'next/link';

export default function AdminNav() {
  return (
    <nav className="bg-gray-800 text-white p-4 mb-8">
      <div className="max-w-6xl mx-auto flex gap-6">
        <Link href="/admin" className="font-bold">Dashboard</Link>
        <Link href="/admin/dates">Dates</Link>
        <Link href="/admin/roster">Roster</Link>
        <Link href="/admin/bookings">Bookings</Link>
        <Link href="/admin/assignments">Assignments</Link>
        <Link href="/admin/payments">Payments</Link>
      </div>
    </nav>
  );
}
```

Include this at the top of every admin page, or use a layout:

```typescript
// app/admin/layout.tsx
import AdminNav from '@/components/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
```

---

## 11. TypeScript Types

Create a shared types file so all pages and API routes use consistent types:

```typescript
// lib/types.ts
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
  bookings?: Booking;
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
```

---

## 12. Error Handling Pattern

Every API route should follow this pattern:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... logic ...
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

Every client-side fetch should handle errors:

```typescript
const res = await fetch('/api/admin/rowers');
if (!res.ok) {
  const err = await res.json();
  alert(err.error || 'Something went wrong');
  return;
}
const data = await res.json();
```
