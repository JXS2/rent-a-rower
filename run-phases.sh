#!/bin/bash
# run-phases.sh
# 
# Overnight autonomous build script for Rent-a-Rower
# Run with: nohup bash run-phases.sh > build-log.txt 2>&1 &
#
# Prerequisites:
#   - Claude Code CLI installed and authenticated (run 'claude --version' to verify)
#   - spec.md in the same directory as this script
#   - Node.js 18+ installed

SPEC="./spec.md"
REPORT="./build-report.md"

echo "# Rent-a-Rower Build Report" > $REPORT
echo "Started: $(date)" >> $REPORT
echo "" >> $REPORT

# ============================================================
# PHASE 1: Foundation & Booking Portal
# ============================================================
echo "========== PHASE 1 STARTING =========="

claude --dangerously-skip-permissions "
You are building a Next.js web application from a spec. Read the full spec at $SPEC.

YOUR TASK: Implement Phase 1 (Section 3) completely. This includes:
- Next.js 14 project setup with App Router and Tailwind
- All database schema SQL (write to a file called supabase/schema.sql so it can be run manually)
- Supabase client helper (lib/supabase.ts) — use environment variables, create both a public client and a server client using the service role key
- Stripe client helper (lib/stripe.ts)
- Geocoding helper (lib/geocode.ts) with Haversine formula
- Resend email helper (lib/email.ts)
- Admin authentication (middleware + login page + API route)
- Season & date management page and API routes
- Roster management page with CSV upload and API routes
- Customer booking portal (root page) with full booking flow
- Stripe checkout integration and webhook handler
- Confirmation page
- All API routes listed in Phase 1

Create placeholder .env.local with these values so the project compiles:
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
GOOGLE_MAPS_API_KEY=placeholder
RESEND_API_KEY=placeholder
ADMIN_PASSWORD=testpass123
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AFTER IMPLEMENTATION — DEBUG LOOP:
1. Run 'npm run build'. If there are errors, fix them and rebuild. Repeat until the build succeeds with zero errors.
2. Start the dev server with 'npm run dev &', wait 5 seconds, then curl http://localhost:3000 to verify it responds. Kill the dev server after.
3. Check that all API route files export the correct HTTP method handlers.
4. Review all imports — make sure no files import from paths that don't exist.

THEN write a Phase 1 summary to $REPORT under a '## Phase 1: Foundation & Booking Portal' heading. Include:
- List of all files created (full paths)
- Build status (clean build yes/no)
- Dev server status (starts successfully yes/no)
- Any issues, warnings, or decisions you made that deviate from the spec
- Any TODO items that need manual setup (like Supabase project creation, Stripe account, etc.)
"

echo "========== PHASE 1 COMPLETE =========="

# ============================================================
# PHASE 2: Assignment Engine
# ============================================================
echo "========== PHASE 2 STARTING =========="

claude --dangerously-skip-permissions "
You are continuing to build a Next.js web application. Read the full spec at $SPEC.

Phase 1 is already implemented in this project (check the existing files). 

YOUR TASK: Implement Phase 2 (Section 4) completely. This includes:
- Assignment algorithm in lib/assignment.ts — follow the pseudocode in the spec exactly
- Admin assignments page at app/admin/assignments/page.tsx
- All API routes for running assignments, manual reassignment, deletion, and notifications
- Assignment notification emails

AFTER IMPLEMENTATION — DEBUG LOOP:
1. Run 'npm run build'. Fix all errors. Repeat until clean build.
2. Create a test file at scripts/test-assignment.ts that:
   - Defines mock rower data (10 rowers with varying commitments, transportation, roles)
   - Defines mock bookings (5 bookings at varying distances with varying rower counts)
   - Runs the assignment algorithm function directly
   - Verifies: at least one driver assigned to far jobs, no all-coxswain crews, coxswain ratio respected, high-commitment rowers assigned first
   - Prints PASS/FAIL for each check
3. Run the test with 'npx ts-node scripts/test-assignment.ts' or 'npx tsx scripts/test-assignment.ts'. If tests fail, fix the algorithm and re-run.
4. Verify the dev server still starts cleanly.

THEN append a Phase 2 summary to $REPORT under '## Phase 2: Assignment Engine'. Include:
- Files created/modified
- Build status
- Test results (which tests passed/failed)
- Any issues or deviations from spec
"

echo "========== PHASE 2 COMPLETE =========="

# ============================================================
# PHASE 3: Rower Portal & Swaps
# ============================================================
echo "========== PHASE 3 STARTING =========="

claude --dangerously-skip-permissions "
You are continuing to build a Next.js web application. Read the full spec at $SPEC.

Phases 1-2 are already implemented in this project.

YOUR TASK: Implement Phase 3 (Section 5) completely. This includes:
- Rower portal page at app/rower/[token]/page.tsx
- Swap initiation UI (dropdown of roster, submit button)
- Swap API routes: create swap, accept, decline
- Swap acceptance/decline pages or handlers
- Swap business logic: full credit transfer, status updates, email notifications
- All swap emails (request, acceptance confirmation, decline notification)

AFTER IMPLEMENTATION — DEBUG LOOP:
1. Run 'npm run build'. Fix all errors. Repeat until clean build.
2. Review the swap business logic carefully:
   - When accepted: assignment.rower_id changes, original rower freed, replacement assigned
   - When declined: assignment reverts to original rower
   - Swap tokens are single-use
   - Swaps allowed even if replacement is over their committed cap
3. Verify no broken imports or missing files.
4. Verify the dev server still starts cleanly.

THEN append a Phase 3 summary to $REPORT under '## Phase 3: Rower Portal & Swaps'. Include:
- Files created/modified
- Build status
- Swap logic review (any edge cases found and handled)
- Any issues or deviations from spec
"

echo "========== PHASE 3 COMPLETE =========="

# ============================================================
# PHASE 4: Admin Dashboard & Payment Tracking
# ============================================================
echo "========== PHASE 4 STARTING =========="

claude --dangerously-skip-permissions "
You are continuing to build a Next.js web application. Read the full spec at $SPEC.

Phases 1-3 are already implemented in this project.

YOUR TASK: Implement Phase 4 (Section 6) completely. This includes:
- Admin dashboard overview page (app/admin/page.tsx) with stats and quick links
- Bookings management page (app/admin/bookings/page.tsx) with filtering
- Payment tracking page (app/admin/payments/page.tsx) with pending/all tabs and 'Mark as Paid'
- Post-date completion flow on the assignments page (checkboxes, mark all complete)
- All API routes for payments and completion

AFTER IMPLEMENTATION — FINAL DEBUG AND REVIEW:
1. Run 'npm run build'. Fix ALL errors until the build is completely clean.
2. Start the dev server, verify it starts without errors, then kill it.
3. Do a FULL PROJECT REVIEW:
   - Check every page file exists and exports a valid React component
   - Check every API route file exists and exports correct HTTP handlers
   - Check all imports resolve to real files
   - Check lib/ files are consistent (no conflicting type definitions)
   - Check middleware.ts covers all admin routes
   - Verify the database schema in supabase/schema.sql matches what the code expects
4. Fix any issues found in the review.
5. Run 'npm run build' one final time to confirm everything is clean.

THEN append to $REPORT:

## Phase 4: Admin Dashboard & Payment Tracking
- Files created/modified
- Build status
- Any issues or deviations from spec

## Final Project Status
- **Overall build status:** [CLEAN / HAS ERRORS — list them]
- **Total files created:** [count]
- **All pages:** [list every page route and confirm it exists]
- **All API routes:** [list every API route and confirm it exists]
- **Environment variables needed:** [list all with descriptions]
- **Manual setup required before deployment:**
  1. Create Supabase project and run supabase/schema.sql
  2. Create Stripe account and get API keys
  3. Set up Stripe webhook
  4. Enable Google Maps Geocoding API
  5. Set up Resend account and verify domain
  6. Deploy to Vercel and set env vars
- **Known issues or TODOs:** [list any]
- **Deviations from spec:** [list any decisions made that differ from the spec]
"

echo "========== PHASE 4 COMPLETE =========="

echo "" >> $REPORT
echo "---" >> $REPORT
echo "Build completed: $(date)" >> $REPORT
echo ""
echo "============================================"
echo "BUILD COMPLETE. Check build-report.md"
echo "============================================"
