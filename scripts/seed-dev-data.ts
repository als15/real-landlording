/**
 * Development Database Seed Script
 *
 * Creates test data for local development and PR preview environments.
 * Run with: npm run seed:dev
 *
 * Prerequisites:
 * - .env.development.local must be configured with DEV Supabase credentials
 * - DEV database must have all migrations applied
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure you have .env.development.local configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test data
const TEST_ADMIN = {
  email: 'admin@test.dev',
  password: 'TestAdmin123!',
  name: 'Test Admin',
};

const TEST_LANDLORDS = [
  {
    email: 'landlord1@test.dev',
    password: 'TestLandlord123!',
    name: 'John Smith',
    phone: '215-555-0101',
    properties: ['19123', '19125'],
  },
  {
    email: 'landlord2@test.dev',
    password: 'TestLandlord123!',
    name: 'Jane Doe',
    phone: '215-555-0102',
    properties: ['19130'],
  },
];

const TEST_VENDORS = [
  {
    email: 'plumber@test.dev',
    password: 'TestVendor123!',
    contact_name: 'Bob The Plumber',
    business_name: "Bob's Plumbing Services",
    phone: '215-555-0201',
    services: ['plumber'],
    service_areas: ['19123', '19125', '19130', '19147'],
    licensed: true,
    insured: true,
    rental_experience: true,
    status: 'active',
  },
  {
    email: 'electrician@test.dev',
    password: 'TestVendor123!',
    contact_name: 'Sarah Sparks',
    business_name: 'Sparks Electric',
    phone: '215-555-0202',
    services: ['electrician'],
    service_areas: ['19123', '19125', '19147'],
    licensed: true,
    insured: true,
    rental_experience: true,
    status: 'active',
  },
  {
    email: 'handyman@test.dev',
    password: 'TestVendor123!',
    contact_name: 'Mike Fix-It',
    business_name: 'Fix-It Fast',
    phone: '215-555-0203',
    services: ['handyman', 'painter'],
    service_areas: ['19123', '19125', '19130', '19147', '19148'],
    licensed: false,
    insured: true,
    rental_experience: true,
    status: 'active',
  },
  {
    email: 'pending-vendor@test.dev',
    password: 'TestVendor123!',
    contact_name: 'New Vendor',
    business_name: 'New Vendor Services',
    phone: '215-555-0204',
    services: ['hvac'],
    service_areas: ['19123'],
    licensed: true,
    insured: false,
    rental_experience: false,
    status: 'pending_review',
  },
];

const TEST_REQUESTS = [
  {
    landlord_email: 'landlord1@test.dev',
    landlord_name: 'John Smith',
    landlord_phone: '215-555-0101',
    service_type: 'plumber',
    property_location: '19123',
    job_description: 'Leaky faucet in kitchen. Dripping constantly, need it fixed ASAP.',
    urgency: 'high',
    status: 'new',
  },
  {
    landlord_email: 'landlord1@test.dev',
    landlord_name: 'John Smith',
    landlord_phone: '215-555-0101',
    service_type: 'electrician',
    property_location: '19125',
    job_description: 'Need to install new light fixtures in two bedrooms.',
    urgency: 'low',
    status: 'matched',
  },
  {
    landlord_email: 'landlord2@test.dev',
    landlord_name: 'Jane Doe',
    landlord_phone: '215-555-0102',
    service_type: 'handyman',
    property_location: '19130',
    job_description: 'General repairs needed: fix door hinges, patch drywall holes.',
    urgency: 'medium',
    status: 'new',
  },
  {
    landlord_email: 'anonymous@example.com',
    landlord_name: 'Anonymous User',
    landlord_phone: '215-555-9999',
    service_type: 'painter',
    property_location: '19147',
    job_description: 'Full interior paint job for 3BR apartment before new tenant moves in.',
    urgency: 'high',
    status: 'new',
  },
];

async function clearExistingData() {
  console.log('Clearing existing test data...');

  // Delete in order due to foreign key constraints
  await supabase.from('request_vendor_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('service_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('vendors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('landlords').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('admin_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Delete auth users (test users only)
  const testEmails = [
    TEST_ADMIN.email,
    ...TEST_LANDLORDS.map((l) => l.email),
    ...TEST_VENDORS.map((v) => v.email),
  ];

  for (const email of testEmails) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  console.log('Existing test data cleared.');
}

async function createAdminUser() {
  console.log('Creating admin user...');

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create admin auth user:', authError.message);
    return;
  }

  const { error: dbError } = await supabase.from('admin_users').insert({
    auth_user_id: authUser.user.id,
    email: TEST_ADMIN.email,
    name: TEST_ADMIN.name,
    role: 'admin',
  });

  if (dbError) {
    console.error('Failed to create admin record:', dbError.message);
    return;
  }

  console.log(`Admin created: ${TEST_ADMIN.email} / ${TEST_ADMIN.password}`);
}

async function createLandlords() {
  console.log('Creating landlords...');

  for (const landlord of TEST_LANDLORDS) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: landlord.email,
      password: landlord.password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`Failed to create landlord auth user ${landlord.email}:`, authError.message);
      continue;
    }

    const { error: dbError } = await supabase.from('landlords').insert({
      auth_user_id: authUser.user.id,
      email: landlord.email,
      name: landlord.name,
      phone: landlord.phone,
      properties: landlord.properties,
    });

    if (dbError) {
      console.error(`Failed to create landlord record ${landlord.email}:`, dbError.message);
      continue;
    }

    console.log(`Landlord created: ${landlord.email}`);
  }
}

async function createVendors() {
  console.log('Creating vendors...');

  for (const vendor of TEST_VENDORS) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: vendor.email,
      password: vendor.password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`Failed to create vendor auth user ${vendor.email}:`, authError.message);
      continue;
    }

    const { error: dbError } = await supabase.from('vendors').insert({
      auth_user_id: authUser.user.id,
      email: vendor.email,
      contact_name: vendor.contact_name,
      business_name: vendor.business_name,
      phone: vendor.phone,
      services: vendor.services,
      service_areas: vendor.service_areas,
      licensed: vendor.licensed,
      insured: vendor.insured,
      rental_experience: vendor.rental_experience,
      status: vendor.status,
      terms_accepted: vendor.status === 'active',
      terms_accepted_at: vendor.status === 'active' ? new Date().toISOString() : null,
    });

    if (dbError) {
      console.error(`Failed to create vendor record ${vendor.email}:`, dbError.message);
      continue;
    }

    console.log(`Vendor created: ${vendor.email} (${vendor.status})`);
  }
}

async function createServiceRequests() {
  console.log('Creating service requests...');

  // Get landlord IDs for linking
  const { data: landlords } = await supabase.from('landlords').select('id, email');
  const landlordMap = new Map(landlords?.map((l) => [l.email, l.id]) || []);

  for (const request of TEST_REQUESTS) {
    const landlordId = landlordMap.get(request.landlord_email) || null;

    const { data: newRequest, error: dbError } = await supabase
      .from('service_requests')
      .insert({
        landlord_id: landlordId,
        landlord_email: request.landlord_email,
        landlord_name: request.landlord_name,
        landlord_phone: request.landlord_phone,
        service_type: request.service_type,
        property_location: request.property_location,
        job_description: request.job_description,
        urgency: request.urgency,
        status: request.status,
      })
      .select()
      .single();

    if (dbError) {
      console.error(`Failed to create request:`, dbError.message);
      continue;
    }

    console.log(`Request created: ${request.service_type} in ${request.property_location}`);

    // If matched, create a match record
    if (request.status === 'matched' && newRequest) {
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id')
        .contains('services', [request.service_type])
        .eq('status', 'active')
        .limit(1);

      if (vendors && vendors.length > 0) {
        await supabase.from('request_vendor_matches').insert({
          request_id: newRequest.id,
          vendor_id: vendors[0].id,
          intro_sent: true,
          intro_sent_at: new Date().toISOString(),
        });
        console.log(`  -> Matched with vendor`);
      }
    }
  }
}

async function seed() {
  console.log('='.repeat(50));
  console.log('Seeding development database...');
  console.log(`Database: ${supabaseUrl}`);
  console.log('='.repeat(50));
  console.log('');

  try {
    await clearExistingData();
    console.log('');

    await createAdminUser();
    console.log('');

    await createLandlords();
    console.log('');

    await createVendors();
    console.log('');

    await createServiceRequests();
    console.log('');

    console.log('='.repeat(50));
    console.log('Seed completed successfully!');
    console.log('');
    console.log('Test accounts:');
    console.log(`  Admin:    ${TEST_ADMIN.email} / ${TEST_ADMIN.password}`);
    console.log(`  Landlord: ${TEST_LANDLORDS[0].email} / ${TEST_LANDLORDS[0].password}`);
    console.log(`  Vendor:   ${TEST_VENDORS[0].email} / ${TEST_VENDORS[0].password}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
