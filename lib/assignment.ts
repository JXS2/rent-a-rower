/**
 * Assignment Algorithm for Rent-a-Rower
 *
 * This is a pure function that takes bookings and rowers for a date
 * and produces optimal assignments. It does NOT make database calls.
 *
 * The calling API route is responsible for fetching data and persisting results.
 */

import { Booking, Rower, Customer } from './types';

/**
 * Extended booking type with customer data needed for distance calculation
 */
export interface BookingWithCustomer extends Booking {
  customers: Customer;
}

/**
 * Extended rower type with computed availability metrics
 */
export interface RowerWithAvailability extends Rower {
  completed_count: number;  // assignments where status='completed' and rower is completed_by
  pending_count: number;    // assignments where status='assigned' or 'swap_pending'
}

/**
 * Transportation classification based on distance
 */
type TransportNeed = 'walk' | 'bike' | 'car';

/**
 * Booking extended with transport classification
 */
interface ClassifiedBooking extends BookingWithCustomer {
  transport_need: TransportNeed;
}

/**
 * Result of the assignment algorithm
 */
export interface AssignmentResult {
  assignments: { bookingId: string; rowerId: string }[];
  unfilled: { bookingId: string; needed: number; assigned: number; reason: string }[];
  warnings: string[];
}

/**
 * Classify a booking by its transportation need based on customer distance
 */
function classifyTransportNeed(distanceMiles: number | null): TransportNeed {
  // Err on the safe side if distance is unknown
  if (distanceMiles === null) return 'car';

  if (distanceMiles > 4) return 'car';
  if (distanceMiles > 1) return 'bike';
  return 'walk';
}

/**
 * Check if a rower can reach a job based on their transportation and job needs
 */
function canReachJob(
  rowerTransport: 'car' | 'bike' | 'none',
  jobNeed: TransportNeed,
  driverAlreadyAssigned: boolean
): boolean {
  if (jobNeed === 'walk') {
    // Anyone can reach walkable jobs
    return true;
  }

  if (jobNeed === 'bike') {
    // Need bike or car for bikeable jobs
    return rowerTransport === 'bike' || rowerTransport === 'car';
  }

  if (jobNeed === 'car') {
    // If driver already assigned, anyone can come
    if (driverAlreadyAssigned) return true;
    // Otherwise, this should only be called after driver assignment
    return rowerTransport === 'car';
  }

  return false;
}

/**
 * Main assignment algorithm
 *
 * @param dateId - UUID of the date being assigned
 * @param bookings - All bookings for this date
 * @param rowers - All rowers with availability data
 * @returns Structured assignment result
 */
export function assignRowers(
  dateId: string,
  bookings: BookingWithCustomer[],
  rowers: RowerWithAvailability[]
): AssignmentResult {
  const assignments: { bookingId: string; rowerId: string }[] = [];
  const unfilled: { bookingId: string; needed: number; assigned: number; reason: string }[] = [];
  const warnings: string[] = [];

  // Calculate remaining commitments for each rower
  const rowersWithRemaining = rowers.map(r => ({
    ...r,
    remaining_commitments: r.committed_rars - r.completed_count - r.pending_count
  }));

  // Filter to only available rowers (those with remaining commitments)
  const availableRowers = rowersWithRemaining.filter(r => r.remaining_commitments > 0);

  // Edge case: No available rowers at all
  if (availableRowers.length === 0) {
    bookings.forEach(booking => {
      unfilled.push({
        bookingId: booking.id,
        needed: booking.num_rowers,
        assigned: 0,
        reason: 'No available rowers (all commitments fulfilled)'
      });
    });
    return { assignments, unfilled, warnings };
  }

  // Sort bookings by num_rowers DESC (largest jobs first)
  const sortedBookings = [...bookings].sort((a, b) => b.num_rowers - a.num_rowers);

  // Sort rowers by remaining commitments DESC (most committed first)
  const sortedRowers = [...availableRowers].sort((a, b) => b.remaining_commitments - a.remaining_commitments);

  // Classify each booking by transportation need
  const classifiedBookings: ClassifiedBooking[] = sortedBookings.map(booking => ({
    ...booking,
    transport_need: classifyTransportNeed(booking.customers.distance_miles)
  }));

  // Track which rowers are assigned today (max 1 job per rower per date)
  const assignedToday = new Set<string>();

  // Process each booking (largest first)
  for (const booking of classifiedBookings) {
    const slotsNeeded = booking.num_rowers;
    const assignedToJob: RowerWithAvailability[] = [];
    const maxCox = slotsNeeded === 1 ? 0 : Math.floor(slotsNeeded / 2);
    let coxCount = 0;

    // STEP 1: If job needs a car, assign one driver first
    if (booking.transport_need === 'car') {
      // Find a driver - prefer rower over coxswain to save cox slots
      const drivers = sortedRowers.filter(r =>
        r.transportation === 'car' &&
        !assignedToday.has(r.id) &&
        r.remaining_commitments > 0
      );

      // Prefer rowers over coxswains
      const driverRower = drivers.find(r => r.role === 'rower');
      const driverCox = drivers.find(r => r.role === 'coxswain');
      const driver = driverRower || driverCox;

      if (!driver) {
        // Can't fill this job - no drivers available
        unfilled.push({
          bookingId: booking.id,
          needed: booking.num_rowers,
          assigned: 0,
          reason: `Job requires car (${booking.customers.distance_miles?.toFixed(1)} miles) but no drivers available`
        });
        continue; // Skip to next booking
      }

      assignedToJob.push(driver);
      assignedToday.add(driver.id);
      if (driver.role === 'coxswain') coxCount++;
    }

    // STEP 2: Fill remaining slots from sorted rower list
    const remainingSlots = slotsNeeded - assignedToJob.length;
    const driverAlreadyAssigned = booking.transport_need === 'car' && assignedToJob.length > 0;

    for (let i = 0; i < remainingSlots; i++) {
      const candidate = sortedRowers.find(r =>
        !assignedToday.has(r.id) &&
        r.remaining_commitments > 0 &&
        canReachJob(r.transportation, booking.transport_need, driverAlreadyAssigned) &&
        (r.role !== 'coxswain' || coxCount < maxCox)
      );

      if (!candidate) {
        // Can't find anyone for this slot
        break;
      }

      assignedToJob.push(candidate);
      assignedToday.add(candidate.id);
      if (candidate.role === 'coxswain') coxCount++;
    }

    // STEP 3: Validate - no all-coxswain crews
    if (assignedToJob.length > 1 && assignedToJob.every(r => r.role === 'coxswain')) {
      // Try to swap the last coxswain for an available rower
      const lastCox = assignedToJob[assignedToJob.length - 1];
      const replacementRower = sortedRowers.find(r =>
        r.role === 'rower' &&
        !assignedToday.has(r.id) &&
        r.remaining_commitments > 0 &&
        canReachJob(r.transportation, booking.transport_need, driverAlreadyAssigned)
      );

      if (replacementRower) {
        // Swap out the last coxswain
        assignedToJob.pop();
        assignedToday.delete(lastCox.id);
        assignedToJob.push(replacementRower);
        assignedToday.add(replacementRower.id);
        coxCount--;
        warnings.push(`Booking ${booking.id}: Swapped coxswain for rower to avoid all-cox crew`);
      } else {
        // Can't fix the all-cox problem
        warnings.push(`Booking ${booking.id}: All assigned are coxswains and no rowers available to swap`);
      }
    }

    // STEP 4: Check if fully filled
    if (assignedToJob.length < booking.num_rowers) {
      // Determine the reason
      let reason = 'Insufficient available rowers';

      if (booking.num_rowers === 1 && assignedToJob.length === 0) {
        // Check if only coxswains are available
        const hasAvailableRowers = sortedRowers.some(r =>
          r.role === 'rower' &&
          !assignedToday.has(r.id) &&
          r.remaining_commitments > 0 &&
          canReachJob(r.transportation, booking.transport_need, false)
        );
        if (!hasAvailableRowers) {
          reason = 'Single-person job requires a rower but only coxswains available';
        }
      }

      if (booking.transport_need === 'bike' && assignedToJob.length === 0) {
        const hasTransport = sortedRowers.some(r =>
          (r.transportation === 'bike' || r.transportation === 'car') &&
          !assignedToday.has(r.id) &&
          r.remaining_commitments > 0
        );
        if (!hasTransport) {
          reason = `Job requires bike/car transport (${booking.customers.distance_miles?.toFixed(1)} miles) but no suitable rowers available`;
        }
      }

      unfilled.push({
        bookingId: booking.id,
        needed: booking.num_rowers,
        assigned: assignedToJob.length,
        reason
      });
    }

    // Create assignment records for those who were assigned
    for (const rower of assignedToJob) {
      assignments.push({
        bookingId: booking.id,
        rowerId: rower.id
      });
    }
  }

  return { assignments, unfilled, warnings };
}
