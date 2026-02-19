# Rent-a-Rower: Technical Specification & Implementation Guide

## Michigan Men's Rowing Team — February 2026

---

# 1. Project Overview

Rent-a-Rower (RaR) is a fundraising program for the Michigan Men's Rowing Team where local community members can reserve labor from team members for 4-hour sessions on designated dates. This system replaces the current manual process of Google Forms, spreadsheets, and manual payment tracking with a streamlined web application.

## 1.1 Business Context

- ~250 jobs per season, each consisting of one team member working a 4-hour session
- Fixed price: $100 per rower per 4-hour block
- Dates are Sundays, determined by racing schedule and announced mid-semester via Mailchimp
- Team members opt in with a committed number of RaRs (up to 8)
- Rowers can swap assignments — swaps are a full transfer of credit to the replacement
- Customers book one date per order, requesting N rowers for that date
- Rowers are a mix of rowers and coxswains. Every job must not be all coxswains. Max coxswain ratio is 1:1 (at most half the crew can be coxswains). A 1-person job must be a rower.
- Many rowers lack cars. Jobs far from campus need at least one driver assigned. Other crew members ride with the driver.
- Payments accepted via Stripe (online) or cash/check (manually confirmed by admin)

## 1.2 System Goals

- Customer-facing booking portal with live availability and integrated payments
- Admin dashboard for roster management, date management, assignment, and payment tracking
- Rower portal for viewing assignments and initiating swaps (accessed via unique link, no login)
- Automated assignment algorithm that respects transportation, role, and commitment constraints
- Minimal maintenance burden for future, less-technical administrators

## 1.3 Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | Next.js 14 (App Router) | Full-stack React framework |
| Database | Supabase (PostgreSQL) | Free tier, hosted |
| Payments | Stripe | Checkout Sessions for online payments |
| Geocoding | Google Maps Geocoding API | Address to lat/lng conversion |
| Email | Resend | Transactional emails |
| Hosting | Vercel | Free tier, auto-deploy from Git |
| Styling | Tailwind CSS | Minimal UI, utility classes only |

## 1.4 Project Structure

```
rent-a-rower/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Customer booking portal (public)
│   ├── confirmation/           # Post-booking confirmation page
│   ├── rower/[token]/          # Rower portal (unique link, no auth)
│   ├── admin/                  # Admin dashboard (password protected)
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── roster/             # Manage team roster
│   │   ├── dates/              # Manage available dates
│   │   ├── bookings/           # View/manage all bookings
│   │   ├── assignments/        # Run algorithm, review, notify
│   │   └── payments/           # Payment tracking
│   └── api/                    # API routes
├── lib/                        # Shared utilities
│   ├── supabase.ts             # DB client
│   ├── stripe.ts               # Stripe client
│   ├── geocode.ts              # Google Maps geocoding
│   ├── assignment.ts           # Assignment algorithm
│   └── email.ts                # Resend email helpers
├── .env.local                  # Environment variables
└── package.json
```

---

# 2. Database Schema

All tables are created in Supabase (PostgreSQL). Run these in order due to foreign key dependencies.

## 2.1 Seasons Table

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                -- e.g. 'Winter 2026'
  active BOOLEAN DEFAULT true,       -- only one active season at a time
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2.2 Available Dates Table

```sql
CREATE TABLE available_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bookings_open BOOLEAN DEFAULT true,  -- admin can close bookings
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, date)
);
```

## 2.3 Rowers Table

```sql
CREATE TABLE rowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('rower', 'coxswain')),
  transportation TEXT NOT NULL CHECK (transportation IN ('car', 'bike', 'none')),
  committed_rars INTEGER NOT NULL CHECK (committed_rars BETWEEN 1 AND 8),
  token TEXT UNIQUE NOT NULL,         -- unique link token for rower portal
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2.4 Customers Table

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,          -- geocoded from address
  longitude DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,    -- from campus center
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Campus center reference point: University of Michigan Central Campus **(42.2780, -83.7382)**. Distance calculated using Haversine formula after geocoding.

## 2.5 Bookings Table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  date_id UUID REFERENCES available_dates(id),
  num_rowers INTEGER NOT NULL CHECK (num_rowers >= 1),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cash_check')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_id TEXT,              -- Stripe session ID if applicable
  total_amount INTEGER NOT NULL,       -- in cents (num_rowers * 10000)
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2.6 Assignments Table

```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  rower_id UUID REFERENCES rowers(id),
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'swap_pending', 'completed')),
  completed_by UUID REFERENCES rowers(id),  -- NULL until completed; defaults to rower_id
  created_at TIMESTAMPTZ DEFAULT now()
);
```

When a swap is accepted, `rower_id` is updated to the replacement rower. The replacement gets full credit. The original rower's slot is freed.

## 2.7 Swaps Table

```sql
CREATE TABLE swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  original_rower_id UUID REFERENCES rowers(id),
  replacement_rower_id UUID REFERENCES rowers(id),
  replacement_token TEXT UNIQUE NOT NULL,  -- for acceptance link
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

# 3. Phase 1: Foundation & Booking Portal

This is the highest-priority phase. It replaces the Google Form and enables customers to book and pay online. Build and verify this completely before proceeding to Phase 2.

## 3.1 Environment Setup

Create a Next.js 14 project with App Router and Tailwind CSS:

```bash
npx create-next-app@14 rent-a-rower --typescript --tailwind --app --src-dir=false
cd rent-a-rower
npm install @supabase/supabase-js stripe @stripe/stripe-js resend nanoid
```

Required environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
RESEND_API_KEY=<your-resend-api-key>
ADMIN_PASSWORD=<hardcoded-admin-password>
NEXT_PUBLIC_SITE_URL=<your-vercel-url>
```

**For local development/testing:** Create `.env.local` with placeholder values so the project compiles. Use `sk_test_placeholder` for Stripe keys, `placeholder` for other API keys. The app should build and the dev server should start even without real API credentials — API calls will simply fail gracefully at runtime.

## 3.2 Admin Authentication

Simple password-based auth using Next.js middleware. No user accounts.

- Admin visits `/admin` and is prompted for a password
- Password is checked against `ADMIN_PASSWORD` env var
- On success, set an HTTP-only cookie with a signed token (use a simple hash of password + a secret, or just use `crypto.randomUUID()` stored in a server-side variable)
- Middleware checks for valid cookie on all `/admin/*` routes
- Cookie expires after 24 hours

### API Route: `POST /api/admin/login`

```
Request:  { password: string }
Response: { success: boolean }
Sets HTTP-only cookie 'admin_token' on success
```

### Middleware: `middleware.ts`

```
- Match all /admin/* routes (except /api/admin/login)
- Check for 'admin_token' cookie
- If missing or invalid, redirect to /admin/login
```

## 3.3 Season & Date Management (Admin)

### Page: `/admin/dates`

A simple page where admin can:

- Create a new season (text input for name like "Winter 2026"). Only one season can be active at a time. Creating a new season deactivates the previous one.
- Add available dates to the active season (date picker). Dates are addable one at a time.
- Toggle `bookings_open` for each date (checkbox). When closed, customers cannot book that date.
- See a summary: for each date, show total bookings, total rowers requested, and remaining capacity.

### API Routes

```
POST   /api/admin/seasons          -- create season { name }
GET    /api/admin/seasons          -- list seasons
POST   /api/admin/dates            -- add date { season_id, date }
PATCH  /api/admin/dates/:id        -- toggle bookings_open
GET    /api/admin/dates            -- list dates with booking counts
```

## 3.4 Roster Management (Admin)

### Page: `/admin/roster`

Admin uploads the team roster. Support two methods:

- **CSV upload:** columns must be `name, email, phone, role, transportation, committed_rars`. Parse and insert all rows. Generate a unique token (nanoid, 12 chars) for each rower automatically.
- **Manual add:** form with all fields, one rower at a time.

The page displays the current roster in a table: name, role, transportation, committed RaRs, completed RaRs (count of assignments where the rower is `completed_by`), and their unique portal link.

### API Routes

```
POST   /api/admin/rowers           -- add single rower
POST   /api/admin/rowers/bulk      -- CSV upload (array of rowers)
GET    /api/admin/rowers           -- list all rowers with completion counts
DELETE /api/admin/rowers/:id       -- remove rower
PATCH  /api/admin/rowers/:id       -- edit rower details
```

## 3.5 Customer Booking Portal

### Page: `/` (root)

This is the public-facing booking page. It should be simple and functional:

- Team name at the top: "Michigan Men's Rowing — Rent-a-Rower"
- Brief description: "Reserve team members for 4 hours of yard work, moving help, or any labor you need. $100 per rower."
- Available dates shown as selectable cards or buttons. Only dates where `bookings_open = true` are shown. If no dates are available, show: "No dates currently available — check back soon!"
- Once a date is selected, a booking form appears with: customer name, email, phone, address (single text field), and number of rowers needed (dropdown, 1-8)
- Payment method selection: "Pay Online" (Stripe) or "Pay by Cash/Check"
- Submit button creates the booking

### Booking Flow

When the customer submits the form:

1. **Geocode the address** using Google Maps Geocoding API. Calculate distance from campus (42.2780, -83.7382) using Haversine formula. Store lat, lng, and distance_miles on the customer record.
2. **Create the customer record** (or find existing by email and update address if different).
3. **Create the booking record** with `total_amount = num_rowers * 10000` (cents).
4. **If payment method is "stripe":** Create a Stripe Checkout Session for the total amount with line item description "Rent-a-Rower: [N] rowers on [date]". Redirect customer to Stripe hosted checkout. On successful payment, Stripe webhook updates `payment_status` to "paid".
5. **If payment method is "cash_check":** Booking is created with `payment_status = 'pending'`. Customer sees confirmation page with instructions to deliver payment.
6. **Send confirmation email** via Resend with booking details (date, rowers requested, total cost, payment status).

### API Routes

```
POST   /api/bookings                -- create booking
  Request: { name, email, phone, address, date_id, num_rowers, payment_method }
  Response: { booking_id, checkout_url? (only if Stripe) }

POST   /api/webhooks/stripe         -- Stripe webhook handler
  Handles: checkout.session.completed
  Updates booking payment_status to 'paid'

GET    /api/dates/available          -- public: list open dates for active season
```

### Page: `/confirmation`

After booking, redirect here with `booking_id` as query param. Display:

- Booking date
- Number of rowers reserved
- Total cost
- Payment status ("Paid — thank you!" or "Payment pending — please deliver cash/check to [address]")
- "You'll receive a confirmation email shortly"

### Geocoding Helper: `lib/geocode.ts`

```typescript
// Uses Google Maps Geocoding API
// GET https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={key}
//
// Input: address string
// Output: { lat: number, lng: number, formatted_address: string }
//
// Then calculate distance using Haversine formula:
// haversine(42.2780, -83.7382, lat, lng) => distance in miles
//
// Distance classification (used by assignment algorithm in Phase 2):
// <= 1 mile      = walkable  (any rower can be assigned)
// 1 - 4 miles    = bikeable  (need bike or car)
// > 4 miles      = needs car (at least 1 car-owner on the crew)
//
// If geocoding fails, still create the booking but set distance_miles = null
// (admin will need to manually review)
```

---

# 4. Phase 2: Assignment Engine

This phase implements the core scheduling algorithm and the admin interface to run and review assignments. **Phase 1 must be fully built and compiling before starting Phase 2.**

## 4.1 Assignment Algorithm: `lib/assignment.ts`

The algorithm runs once per date, after the admin closes bookings for that date. It takes all bookings for the date and all available rowers, and produces optimal assignments.

### Input

- All bookings for the target date (each with `num_rowers`, customer `distance_miles`)
- All rowers in the active season with: `committed_rars`, completed count (assignments where status = 'completed' and the rower is `completed_by`), pending count (assignments where status = 'assigned'), role, transportation

### Algorithm Pseudocode

```
function assignDate(dateId):
  bookings = getBookingsForDate(dateId) sorted by num_rowers DESC (largest jobs first)
  
  rowers = getAvailableRowers()
  // "available" means: committed_rars - completed_count - pending_assigned_count > 0
  
  // Sort rowers by most remaining commitments first (descending)
  // This ensures high-commitment rowers get scheduled on earlier dates
  rowers.sort(by: remaining_commitments DESC)
  
  // Classify each booking by transportation need based on customer distance
  for each booking:
    if booking.distance_miles is null:    booking.transport_need = 'car'  // err on safe side
    else if booking.distance_miles > 4:   booking.transport_need = 'car'
    else if booking.distance_miles > 1:   booking.transport_need = 'bike'
    else:                                 booking.transport_need = 'walk'
  
  // Track which rowers are assigned on this date (max 1 job per rower per date)
  assigned_today = Set()
  results = []
  unfilled = []
  
  for each booking (largest jobs first):
    slots_needed = booking.num_rowers
    assigned_to_job = []
    max_cox = floor(slots_needed / 2)    // at most half can be coxswains
    if slots_needed == 1: max_cox = 0     // 1-person job must be a rower
    cox_count = 0
    
    // STEP 1: If job needs a car, assign one driver first
    if booking.transport_need == 'car':
      driver = first rower from sorted list where:
        - transportation == 'car'
        - not in assigned_today
        - remaining_commitments > 0
        - prefer role == 'rower' over 'coxswain' (to save cox slots)
      if driver found:
        assigned_to_job.push(driver)
        assigned_today.add(driver)
        if driver.role == 'coxswain': cox_count++
        slots_needed--
    
    // STEP 2: Fill remaining slots from sorted rower list
    for each remaining slot:
      candidate = first rower from sorted list where:
        - not in assigned_today
        - remaining_commitments > 0
        - can reach job:
          - 'walk' jobs: anyone
          - 'bike' jobs: transportation is 'car' or 'bike'
          - 'car' jobs: anyone (driver already assigned in step 1)
        - if role == 'coxswain': cox_count < max_cox
      if candidate found:
        assigned_to_job.push(candidate)
        assigned_today.add(candidate)
        if candidate.role == 'coxswain': cox_count++
    
    // STEP 3: Validate — no all-coxswain crews
    if assigned_to_job.length > 1 AND all are coxswains:
      // Try to swap the last coxswain for an available rower
      attempt swap with any available rower not in assigned_today
    
    // STEP 4: Check if fully filled
    if assigned_to_job.length < booking.num_rowers:
      unfilled.push({ booking, assigned: assigned_to_job.length, needed: booking.num_rowers })
    
    // Create assignment records
    for each person in assigned_to_job:
      INSERT INTO assignments (booking_id, rower_id, status='assigned')
    
    results.push({ booking, assignments: assigned_to_job })
  
  return { results, unfilled }
```

**Important:** If any booking cannot be fully filled, flag it for admin attention. Never partially fill a booking silently — the admin must see and decide what to do.

## 4.2 Assignment Review (Admin)

### Page: `/admin/assignments`

This page allows the admin to run and review assignments per date:

- **Date selector** at top (dropdown of available dates for active season)
- **For dates where assignments haven't been run yet:** Show a "Run Assignments" button and a summary of bookings (count, total rowers needed)
- **For dates where assignments have been run:** Show a table of all assignments grouped by booking. Each group shows:
  - Customer name and address
  - Distance from campus
  - Assigned rowers (name, role, transportation)
  - Any flags: unfilled slots (red warning), all-cox warning
- **Manual override:** Admin can click a rower slot to see a dropdown of available rowers and swap them in
- **Manual add/remove:** Admin can add or remove assignment rows
- **"Notify Rowers" button:** Sends assignment emails to all rowers assigned for that date
- **"Re-run Assignments" button:** Clears existing assignments for the date and re-runs the algorithm (with a confirmation dialog: "This will clear all current assignments for this date. Continue?")

### Assignment Notification Email

When admin clicks "Notify Rowers", each assigned rower receives an email:

- Subject: "Rent-a-Rower Assignment — [Date]"
- Body: Date of the job, customer name and address, names of other rowers on the same job, link to their rower portal

### API Routes

```
POST   /api/admin/assignments/run     -- run algorithm for a date
  Request: { date_id }
  Response: { assignments: [...], unfilled: [...] }

PATCH  /api/admin/assignments/:id     -- manually reassign
  Request: { rower_id }

DELETE /api/admin/assignments/:id     -- remove assignment

POST   /api/admin/assignments/notify  -- send notification emails
  Request: { date_id }
```

---

# 5. Phase 3: Rower Portal & Swaps

This phase gives rowers visibility into their assignments and the ability to initiate swaps. **Phases 1-2 must be built and compiling before starting Phase 3.**

## 5.1 Rower Portal

### Page: `/rower/[token]`

Each rower accesses their portal via a unique URL (e.g., `yoursite.com/rower/abc123def456`). No login required.

The page displays:

- Rower's name at the top
- Summary: "X of Y committed RaRs completed" (e.g., "3 of 6 RaRs completed")
- List of all their assignments, each showing:
  - Date
  - Customer name and address
  - Status: assigned / swap pending / completed
  - Names of other rowers on the same job
- For assignments with status "assigned": a **"Can't Make It"** button to initiate a swap

### API Route

```
GET    /api/rower/[token]             -- get rower info + all assignments
```

## 5.2 Swap Flow

When a rower clicks "Can't Make It" on an assignment:

1. A form appears asking for the replacement rower's name. This should be a **dropdown/autocomplete** of all rowers in the current season roster (so the initiating rower can select the correct person).
2. On submit: a swap record is created with status "pending". A unique acceptance token is generated (nanoid, 16 chars). The assignment status changes to "swap_pending".
3. The **replacement rower receives an email** with:
   - Job details: date, customer name, address
   - Who is asking them to cover
   - Two links: **"Accept"** and **"Decline"**
4. **Accept link** (`/api/swaps/[token]/accept`): Updates swap status to "accepted". Changes the assignment's `rower_id` to the replacement rower. The original rower's slot is freed (their remaining availability goes back up). The replacement rower's assignment count increases.
5. **Decline link** (`/api/swaps/[token]/decline`): Updates swap status to "declined". Assignment status reverts to "assigned" with the original rower. They need to find someone else.
6. The initiating rower's portal shows the swap status in real time.

### Swap Business Logic (Critical)

When a swap is **accepted**, the system must:

- Update the assignment's `rower_id` to the replacement rower
- Set the assignment status back to "assigned" (no longer "swap_pending")
- Set the swap status to "accepted"
- The original rower effectively loses one pending assignment (their availability increases)
- The replacement rower gains one pending assignment (their availability decreases)
- **If the replacement rower has already hit their committed_rars cap, the swap is still allowed** — they're voluntarily taking on extra work
- Send confirmation emails to both rowers

When a swap is **declined**:

- Set the swap status to "declined"
- Set the assignment status back to "assigned"
- The original rower remains assigned

**Swap tokens are single-use.** Once accepted or declined, the link should show a message ("Already accepted/declined") and not allow re-use.

### API Routes

```
POST   /api/swaps                     -- initiate swap
  Request: { assignment_id, replacement_rower_id }

GET    /api/swaps/[token]/accept      -- accept swap (link from email)
GET    /api/swaps/[token]/decline     -- decline swap (link from email)
```

---

# 6. Phase 4: Admin Dashboard & Payment Tracking

This phase completes the admin experience. **Phases 1-3 must be built and compiling before starting Phase 4.**

## 6.1 Dashboard Overview

### Page: `/admin` (main dashboard)

The admin landing page shows at a glance:

- Active season name
- Total bookings this season / total expected revenue
- Revenue collected (Stripe paid + cash/check confirmed) vs outstanding
- Upcoming dates with: booking count, assignment status (not run / assigned / notified), capacity remaining
- Quick links to all admin sub-pages (roster, dates, bookings, assignments, payments)

## 6.2 Bookings Management

### Page: `/admin/bookings`

Table of all bookings with columns:

- Date
- Customer name
- Customer address
- Rowers requested
- Payment method (Stripe / Cash/Check)
- Payment status (Paid / Pending)
- Booking status (Confirmed / Cancelled / Completed)

Filterable by date and payment status. Each row is clickable to see full details including customer contact info.

## 6.3 Payment Tracking

### Page: `/admin/payments`

This page focuses on payment management:

- **Pending Payments tab:** All bookings with `payment_status = 'pending'` and `payment_method = 'cash_check'`. Each row shows: customer name, booking date, amount owed. A **"Mark as Paid"** button on each row updates `payment_status` to "paid".
- **All Payments tab:** All payments (both Stripe and cash/check) with filters. Shows total revenue collected and total outstanding.

### API Routes

```
GET    /api/admin/payments             -- list all payments with filters
PATCH  /api/admin/payments/:booking_id -- mark cash/check as paid
```

## 6.4 Post-Date Completion

After a job date passes, admin needs to confirm who actually completed the work:

- On the **assignments page** for a past date, show a **"Mark Completions"** mode
- Each assignment shows a checkbox. Admin checks off assignments that were completed.
- Checking off an assignment sets `status = 'completed'` and `completed_by = rower_id` (the currently assigned rower, which may have changed due to swaps)
- A **"Mark All Complete"** button for convenience (most jobs will be completed as assigned)
- Uncompleted assignments are flagged for follow-up

### API Routes

```
PATCH  /api/admin/assignments/:id/complete   -- mark single as completed
POST   /api/admin/assignments/complete-all   -- mark all for a date
  Request: { date_id }
```

---

# 7. Key Implementation Notes

## 7.1 Stripe Integration

Use **Stripe Checkout Sessions** (not Payment Intents) for simplicity:

1. Customer selects "Pay Online" and submits booking form
2. Server creates a Checkout Session with line item: "Rent-a-Rower: [N] rowers on [date]" at $100/rower
3. Customer is redirected to Stripe-hosted checkout page
4. On success, Stripe redirects to `/confirmation?booking_id=X`
5. Stripe webhook (`checkout.session.completed`) updates `payment_status` to "paid"
6. Store the Checkout Session ID as `stripe_payment_id` on the booking

**Webhook setup:** The webhook endpoint is `POST /api/webhooks/stripe`. Always verify the webhook signature using `STRIPE_WEBHOOK_SECRET`. Use `stripe.webhooks.constructEvent()` for verification.

## 7.2 Google Maps Geocoding

```
GET https://maps.googleapis.com/maps/api/geocode/json?address={encoded_address}&key={GOOGLE_MAPS_API_KEY}
```

Extract `lat` and `lng` from `results[0].geometry.location`. Calculate distance to campus using Haversine formula. If geocoding fails (bad address, API error), still create the booking but set `distance_miles = null`. These bookings will need admin review.

### Haversine Formula

```typescript
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

## 7.3 Distance Thresholds

| Distance from Campus | Classification | Who Can Be Assigned |
|---------------------|---------------|-------------------|
| ≤ 1 mile | Walkable | Any rower (car, bike, or none) |
| 1 – 4 miles | Bikeable | Rowers with car or bike |
| > 4 miles | Needs Car | At least 1 rower with car required on crew; others can be any transportation (they ride with the driver) |

## 7.4 Email Templates

Use Resend with simple HTML emails. Three email types needed:

1. **Booking Confirmation** (to customer): Date, number of rowers, total cost, payment status, instructions for cash/check if applicable
2. **Assignment Notification** (to rower): Date, customer name and address, crew members, link to rower portal
3. **Swap Request** (to replacement rower): Job details, who is asking, accept/decline links

## 7.5 Security

- **Admin routes:** Protected by middleware checking `admin_token` cookie
- **Rower portal:** Accessed via unguessable token (nanoid, 12+ chars). No auth needed.
- **Swap tokens:** Unguessable (nanoid, 16 chars). Single-use — once accepted or declined, the link shows a status message and cannot be re-used.
- **Public booking page:** No auth. Rate limit the booking API to prevent abuse (10 bookings per IP per hour).
- **Stripe webhooks:** Verify signature using `STRIPE_WEBHOOK_SECRET`.
- **Database:** Use Supabase service role key on server side, anon key only for public reads.

## 7.6 Deployment

1. Push to GitHub repository
2. Connect repo to Vercel for automatic deployments
3. Set all environment variables in Vercel dashboard
4. Set up Stripe webhook endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
5. Enable Google Maps Geocoding API in Google Cloud Console, restrict API key to your domain
6. Configure Resend domain for email deliverability

## 7.7 Handoff Notes for Future Admins

The person inheriting this system needs to do the following each season:

1. Create a new season in `/admin/dates`
2. Add available dates as they become known throughout the semester
3. Upload the new roster CSV in `/admin/roster`
4. Share the booking URL via Mailchimp when dates are announced
5. After bookings close for each date: run assignments, review, notify rowers
6. After each job date: mark completions in the dashboard
7. Check `/admin/payments` periodically to mark cash/check payments as received

**No code changes should be needed between seasons.** All configuration is done through the admin UI.
