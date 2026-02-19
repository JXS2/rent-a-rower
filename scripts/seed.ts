/**
 * Seed script for Rent-a-Rower database
 *
 * This script populates the database with sample data for testing:
 * - 1 active season
 * - 4 available dates
 * - 10 rowers (mix of rowers and coxswains)
 * - 5 customers
 * - 8 bookings
 *
 * Run with: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearExistingData() {
  console.log('🗑️  Clearing existing data...');

  // Delete in reverse order of dependencies
  await supabase.from('swaps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('rowers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('available_dates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✅ Existing data cleared\n');
}

async function seedSeason() {
  console.log('📅 Creating season...');

  const { data, error } = await supabase
    .from('seasons')
    .insert([
      {
        name: 'Winter 2026',
        active: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  console.log(`✅ Created season: ${data.name}\n`);
  return data;
}

async function seedDates(seasonId: string) {
  console.log('📆 Creating available dates...');

  const today = new Date();
  const dates = [];

  // Create 4 Sunday dates in the future
  for (let i = 1; i <= 4; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + (7 * i)); // Next 4 Sundays

    // Find next Sunday
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() + 1);
    }

    dates.push({
      season_id: seasonId,
      date: date.toISOString().split('T')[0],
      bookings_open: i <= 3, // First 3 are open, last one is closed
    });
  }

  const { data, error } = await supabase
    .from('available_dates')
    .insert(dates)
    .select();

  if (error) throw error;
  console.log(`✅ Created ${data.length} available dates\n`);
  return data;
}

async function seedRowers(seasonId: string) {
  console.log('🚣 Creating rowers...');

  const rowers = [
    { name: 'Alex Johnson', email: 'alex@umich.edu', phone: '734-555-0101', role: 'rower', transportation: 'car', committed_rars: 6 },
    { name: 'Sam Williams', email: 'sam@umich.edu', phone: '734-555-0102', role: 'rower', transportation: 'car', committed_rars: 5 },
    { name: 'Jordan Lee', email: 'jordan@umich.edu', phone: '734-555-0103', role: 'coxswain', transportation: 'bike', committed_rars: 4 },
    { name: 'Taylor Brown', email: 'taylor@umich.edu', phone: '734-555-0104', role: 'rower', transportation: 'bike', committed_rars: 6 },
    { name: 'Morgan Davis', email: 'morgan@umich.edu', phone: '734-555-0105', role: 'rower', transportation: 'car', committed_rars: 5 },
    { name: 'Casey Miller', email: 'casey@umich.edu', phone: '734-555-0106', role: 'rower', transportation: 'none', committed_rars: 4 },
    { name: 'Riley Wilson', email: 'riley@umich.edu', phone: '734-555-0107', role: 'coxswain', transportation: 'car', committed_rars: 3 },
    { name: 'Drew Moore', email: 'drew@umich.edu', phone: '734-555-0108', role: 'rower', transportation: 'bike', committed_rars: 6 },
    { name: 'Jamie Taylor', email: 'jamie@umich.edu', phone: '734-555-0109', role: 'rower', transportation: 'car', committed_rars: 5 },
    { name: 'Avery Anderson', email: 'avery@umich.edu', phone: '734-555-0110', role: 'rower', transportation: 'none', committed_rars: 4 },
  ];

  const rowersWithTokens = rowers.map(r => ({
    ...r,
    season_id: seasonId,
    token: nanoid(12),
  }));

  const { data, error } = await supabase
    .from('rowers')
    .insert(rowersWithTokens)
    .select();

  if (error) throw error;
  console.log(`✅ Created ${data.length} rowers\n`);
  return data;
}

async function seedCustomers() {
  console.log('👥 Creating customers...');

  // University of Michigan campus center coordinates: 42.2780, -83.7382
  const customers = [
    {
      name: 'John Smith',
      email: 'john.smith@gmail.com',
      phone: '734-555-1001',
      address: '500 S State St, Ann Arbor, MI 48109',
      latitude: 42.2780,
      longitude: -83.7382,
      distance_miles: 0.5, // Close to campus
    },
    {
      name: 'Mary Johnson',
      email: 'mary.j@gmail.com',
      phone: '734-555-1002',
      address: '1234 Broadway St, Ann Arbor, MI 48105',
      latitude: 42.2850,
      longitude: -83.7450,
      distance_miles: 2.3, // Bike distance
    },
    {
      name: 'Robert Williams',
      email: 'rwilliams@gmail.com',
      phone: '734-555-1003',
      address: '5678 Maple Rd, Ann Arbor, MI 48103',
      latitude: 42.3100,
      longitude: -83.7800,
      distance_miles: 5.2, // Car required
    },
    {
      name: 'Patricia Brown',
      email: 'pbrown@gmail.com',
      phone: '734-555-1004',
      address: '910 Hill St, Ann Arbor, MI 48104',
      latitude: 42.2810,
      longitude: -83.7400,
      distance_miles: 0.8, // Walking distance
    },
    {
      name: 'Michael Davis',
      email: 'mdavis@gmail.com',
      phone: '734-555-1005',
      address: '2468 Main St, Ann Arbor, MI 48104',
      latitude: 42.2900,
      longitude: -83.7500,
      distance_miles: 3.1, // Bike distance
    },
  ];

  const { data, error } = await supabase
    .from('customers')
    .insert(customers)
    .select();

  if (error) throw error;
  console.log(`✅ Created ${data.length} customers\n`);
  return data;
}

async function seedBookings(dates: any[], customers: any[]) {
  console.log('📝 Creating bookings...');

  const bookings = [
    // Date 1
    { date_id: dates[0].id, customer_id: customers[0].id, num_rowers: 2, payment_method: 'stripe', payment_status: 'paid', total_amount: 20000, status: 'confirmed' },
    { date_id: dates[0].id, customer_id: customers[1].id, num_rowers: 3, payment_method: 'stripe', payment_status: 'paid', total_amount: 30000, status: 'confirmed' },
    { date_id: dates[0].id, customer_id: customers[2].id, num_rowers: 4, payment_method: 'cash_check', payment_status: 'pending', total_amount: 40000, status: 'confirmed' },

    // Date 2
    { date_id: dates[1].id, customer_id: customers[3].id, num_rowers: 1, payment_method: 'stripe', payment_status: 'paid', total_amount: 10000, status: 'confirmed' },
    { date_id: dates[1].id, customer_id: customers[4].id, num_rowers: 2, payment_method: 'cash_check', payment_status: 'pending', total_amount: 20000, status: 'confirmed' },

    // Date 3
    { date_id: dates[2].id, customer_id: customers[0].id, num_rowers: 3, payment_method: 'stripe', payment_status: 'paid', total_amount: 30000, status: 'confirmed' },
    { date_id: dates[2].id, customer_id: customers[2].id, num_rowers: 2, payment_method: 'stripe', payment_status: 'paid', total_amount: 20000, status: 'confirmed' },
    { date_id: dates[2].id, customer_id: customers[4].id, num_rowers: 1, payment_method: 'cash_check', payment_status: 'pending', total_amount: 10000, status: 'confirmed' },
  ];

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookings)
    .select();

  if (error) throw error;
  console.log(`✅ Created ${data.length} bookings\n`);
  return data;
}

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data
    await clearExistingData();

    // Seed data in order
    const season = await seedSeason();
    const dates = await seedDates(season.id);
    const rowers = await seedRowers(season.id);
    const customers = await seedCustomers();
    const bookings = await seedBookings(dates, customers);

    console.log('✨ Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - 1 season: ${season.name}`);
    console.log(`   - ${dates.length} available dates`);
    console.log(`   - ${rowers.length} rowers`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${bookings.length} bookings`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Visit http://localhost:3000/login');
    console.log('   2. Log in with your admin password');
    console.log('   3. Go to /admin/assignments to run the assignment algorithm');
    console.log('   4. Check out the other admin pages!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
