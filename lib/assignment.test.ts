/**
 * Basic tests for assignment algorithm
 * Run with: npx tsx lib/assignment.test.ts
 */

import { assignRowers, BookingWithCustomer, RowerWithAvailability, AssignmentResult } from './assignment';

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  assert(isEqual, `${message} (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
}

// Mock data generators
function createRower(
  id: string,
  name: string,
  role: 'rower' | 'coxswain',
  transportation: 'car' | 'bike' | 'none',
  committedRars: number,
  completedCount = 0,
  pendingCount = 0
): RowerWithAvailability {
  return {
    id,
    season_id: 'season-1',
    name,
    email: `${name.toLowerCase()}@example.com`,
    phone: null,
    role,
    transportation,
    committed_rars: committedRars,
    token: `token-${id}`,
    created_at: new Date().toISOString(),
    completed_count: completedCount,
    pending_count: pendingCount
  };
}

function createBooking(
  id: string,
  numRowers: number,
  distanceMiles: number | null
): BookingWithCustomer {
  return {
    id,
    customer_id: 'customer-1',
    date_id: 'date-1',
    num_rowers: numRowers,
    payment_method: 'stripe',
    payment_status: 'paid',
    stripe_payment_id: null,
    total_amount: numRowers * 10000,
    status: 'confirmed',
    created_at: new Date().toISOString(),
    customers: {
      id: 'customer-1',
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '555-1234',
      address: '123 Main St',
      latitude: 42.28,
      longitude: -83.74,
      distance_miles: distanceMiles,
      created_at: new Date().toISOString()
    }
  };
}

// Test 1: Simple assignment - one booking, enough rowers
function testSimpleAssignment() {
  console.log('\n=== Test 1: Simple assignment ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 0, 0),
    createRower('r2', 'Bob', 'rower', 'bike', 4, 0, 0),
    createRower('r3', 'Charlie', 'rower', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 2, 0.5) // walkable distance, need 2 rowers
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 2, 'Should assign 2 rowers');
  assert(result.unfilled.length === 0, 'Should have no unfilled bookings');
  assert(result.assignments[0].bookingId === 'b1', 'Assignment should be for booking b1');
}

// Test 2: Car requirement
function testCarRequirement() {
  console.log('\n=== Test 2: Car requirement ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 0, 0),
    createRower('r2', 'Bob', 'rower', 'bike', 4, 0, 0),
    createRower('r3', 'Charlie', 'rower', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 3, 5.0) // 5 miles - requires car
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 3, 'Should assign 3 rowers');
  assert(result.unfilled.length === 0, 'Should have no unfilled bookings');

  // First assignment should be the driver (Alice with car)
  const firstAssignment = result.assignments[0];
  assert(firstAssignment.rowerId === 'r1', 'First assignment should be the driver');
}

// Test 3: No drivers available for car-required job
function testNoDrivers() {
  console.log('\n=== Test 3: No drivers available ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Bob', 'rower', 'bike', 4, 0, 0),
    createRower('r2', 'Charlie', 'rower', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 2, 5.0) // 5 miles - requires car
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 0, 'Should not assign anyone');
  assert(result.unfilled.length === 1, 'Should have one unfilled booking');
  assert(result.unfilled[0].reason.includes('no drivers available'), 'Reason should mention no drivers');
}

// Test 4: Largest jobs first
function testLargestJobsFirst() {
  console.log('\n=== Test 4: Largest jobs first ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 0, 0),
    createRower('r2', 'Bob', 'rower', 'bike', 4, 0, 0),
    createRower('r3', 'Charlie', 'rower', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 1, 0.5), // small job
    createBooking('b2', 3, 0.5)  // large job
  ];

  const result = assignRowers('date-1', bookings, rowers);

  // Large job (b2) should be filled completely
  const b2Assignments = result.assignments.filter(a => a.bookingId === 'b2');
  assert(b2Assignments.length === 3, 'Large job should get 3 rowers');

  // Small job (b1) can't be filled (no rowers left)
  const b1Unfilled = result.unfilled.find(u => u.bookingId === 'b1');
  assert(b1Unfilled !== undefined, 'Small job should be unfilled');
}

// Test 5: Coxswain ratio constraint
function testCoxswainRatio() {
  console.log('\n=== Test 5: Coxswain ratio constraint ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 0, 0),
    createRower('r2', 'Bob', 'coxswain', 'bike', 4, 0, 0),
    createRower('r3', 'Charlie', 'coxswain', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 2, 0.5) // needs 2, max 1 coxswain
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 2, 'Should assign 2 rowers');

  // Should assign 1 rower and 1 coxswain (not 2 coxswains)
  const assignedIds = result.assignments.map(a => a.rowerId);
  assert(assignedIds.includes('r1'), 'Should include the rower');
}

// Test 6: Single-person job must be a rower
function testSinglePersonMustBeRower() {
  console.log('\n=== Test 6: Single-person job must be rower ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Bob', 'coxswain', 'bike', 4, 0, 0),
    createRower('r2', 'Charlie', 'coxswain', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 1, 0.5) // single person job
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 0, 'Should not assign coxswain to single-person job');
  assert(result.unfilled.length === 1, 'Should have unfilled booking');
  assert(result.unfilled[0].reason.includes('only coxswains available'), 'Reason should mention only coxswains');
}

// Test 7: No available rowers
function testNoAvailableRowers() {
  console.log('\n=== Test 7: No available rowers ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 4, 0), // all commitments fulfilled
    createRower('r2', 'Bob', 'rower', 'bike', 4, 3, 1) // all commitments fulfilled
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 2, 0.5)
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 0, 'Should not assign anyone');
  assert(result.unfilled.length === 1, 'Should have unfilled booking');
  assert(result.unfilled[0].reason.includes('all commitments fulfilled'), 'Reason should mention commitments fulfilled');
}

// Test 8: One rower per date constraint
function testOneRowerPerDate() {
  console.log('\n=== Test 8: One rower per date constraint ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 0, 0),
    createRower('r2', 'Bob', 'rower', 'bike', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 1, 0.5),
    createBooking('b2', 1, 0.5)
  ];

  const result = assignRowers('date-1', bookings, rowers);

  // Each rower should only be assigned once
  const rowerAssignments = result.assignments.reduce((acc, a) => {
    acc[a.rowerId] = (acc[a.rowerId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.values(rowerAssignments).forEach(count => {
    assert(count === 1, 'Each rower should only be assigned once per date');
  });
}

// Test 9: Bike distance requirement
function testBikeDistance() {
  console.log('\n=== Test 9: Bike distance requirement ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'bike', 4, 0, 0),
    createRower('r2', 'Bob', 'rower', 'none', 4, 0, 0)
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 1, 2.0) // bikeable distance (1-4 miles)
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 1, 'Should assign one rower');
  assert(result.assignments[0].rowerId === 'r1', 'Should assign rower with bike');
}

// Test 10: Prioritize by remaining commitments
function testPrioritizeByCommitments() {
  console.log('\n=== Test 10: Prioritize by remaining commitments ===');

  const rowers: RowerWithAvailability[] = [
    createRower('r1', 'Alice', 'rower', 'car', 4, 3, 0), // 1 remaining
    createRower('r2', 'Bob', 'rower', 'bike', 6, 2, 0),  // 4 remaining
    createRower('r3', 'Charlie', 'rower', 'none', 5, 1, 0) // 4 remaining
  ];

  const bookings: BookingWithCustomer[] = [
    createBooking('b1', 2, 0.5)
  ];

  const result = assignRowers('date-1', bookings, rowers);

  assert(result.assignments.length === 2, 'Should assign 2 rowers');

  // Should prioritize Bob and Charlie (4 remaining each) over Alice (1 remaining)
  const assignedIds = result.assignments.map(a => a.rowerId);
  assert(assignedIds.includes('r2') && assignedIds.includes('r3'),
    'Should assign rowers with more remaining commitments first');
}

// Run all tests
console.log('Running assignment algorithm tests...\n');

testSimpleAssignment();
testCarRequirement();
testNoDrivers();
testLargestJobsFirst();
testCoxswainRatio();
testSinglePersonMustBeRower();
testNoAvailableRowers();
testOneRowerPerDate();
testBikeDistance();
testPrioritizeByCommitments();

console.log('\n✅ All tests passed!');
