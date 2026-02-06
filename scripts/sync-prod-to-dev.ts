/**
 * Sync data from production to dev database
 * Run with: npx tsx scripts/sync-prod-to-dev.ts
 */

import { createClient } from '@supabase/supabase-js';

// Production (source)
const PROD_URL = 'https://jhwnvlvaglvadavszfhh.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impod252bHZhZ2x2YWRhdnN6ZmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDcwOTMzMSwiZXhwIjoyMDgwMjg1MzMxfQ.nGHs04JcdahmJrLHp-_SyPfnqnlcXA9wvnK--XunCes';

// Dev (destination)
const DEV_URL = 'https://xnrwaltmxkrysawkcndb.supabase.co';
const DEV_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucndhbHRteGtyeXNhd2tjbmRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIxOTE3OSwiZXhwIjoyMDg1Nzk1MTc5fQ.--B0RM9urpTOE7hWRHobZzq0HJRUa60LayRcmnSimc0';

const prodClient = createClient(PROD_URL, PROD_KEY);
const devClient = createClient(DEV_URL, DEV_KEY);

// Columns to exclude from sync (FK columns that reference auth.users)
const EXCLUDE_COLUMNS: Record<string, string[]> = {
  landlords: ['auth_user_id'],
  vendors: ['auth_user_id'],
};

// Columns that might not exist in dev (schema differences)
const OPTIONAL_COLUMNS: Record<string, string[]> = {
  service_requests: ['budget_range'],
};

async function syncTable(tableName: string) {
  console.log(`\n📥 Syncing ${tableName}...`);

  // Fetch all data from production
  const { data: prodData, error: fetchError } = await prodClient
    .from(tableName)
    .select('*');

  if (fetchError) {
    console.error(`  ❌ Error fetching from production: ${fetchError.message}`);
    return { synced: 0, errors: 1 };
  }

  if (!prodData || prodData.length === 0) {
    console.log(`  ⚪ No data in production`);
    return { synced: 0, errors: 0 };
  }

  console.log(`  📊 Found ${prodData.length} records in production`);

  // Clean data - remove excluded columns and optional columns
  const excludeCols = EXCLUDE_COLUMNS[tableName] || [];
  const optionalCols = OPTIONAL_COLUMNS[tableName] || [];
  const colsToRemove = [...excludeCols, ...optionalCols];

  const cleanedData = prodData.map((row) => {
    const cleaned = { ...row };
    for (const col of colsToRemove) {
      delete cleaned[col];
    }
    return cleaned;
  });

  // Clear existing data in dev (to avoid conflicts)
  // Use a raw SQL approach to delete all
  const { error: deleteError } = await devClient
    .from(tableName)
    .delete()
    .gte('created_at', '1900-01-01'); // Delete all with a broad filter

  if (deleteError) {
    console.error(`  ⚠️  Error clearing dev table: ${deleteError.message}`);
    // Try alternative delete
    await devClient.from(tableName).delete().neq('id', '');
  }

  // Insert data into dev in batches
  const BATCH_SIZE = 50;
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < cleanedData.length; i += BATCH_SIZE) {
    const batch = cleanedData.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await devClient
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (insertError) {
      console.error(`  ❌ Error inserting batch ${i / BATCH_SIZE + 1}: ${insertError.message}`);
      errors++;

      // Try inserting one by one to identify problematic records
      for (const record of batch) {
        const { error: singleError } = await devClient
          .from(tableName)
          .upsert(record, { onConflict: 'id' });

        if (!singleError) {
          synced++;
        }
      }
    } else {
      synced += batch.length;
    }
  }

  console.log(`  ✅ Synced ${synced}/${prodData.length} records`);
  return { synced, errors };
}

async function main() {
  console.log('🔄 Starting production → dev sync\n');
  console.log('Production:', PROD_URL);
  console.log('Dev:', DEV_URL);

  // Tables to sync in order (respecting foreign key dependencies)
  // Skip tables that have FK to auth.users - we'll handle those specially
  const TABLES_TO_SYNC = [
    'landlords',      // Will have auth_user_id nulled
    'vendors',        // Will have auth_user_id nulled
    'service_requests',
    'request_vendor_matches',
  ];

  const results: Record<string, { synced: number; errors: number }> = {};

  for (const table of TABLES_TO_SYNC) {
    results[table] = await syncTable(table);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 SYNC SUMMARY');
  console.log('='.repeat(50));

  for (const [table, result] of Object.entries(results)) {
    const status = result.errors > 0 ? '⚠️' : '✅';
    console.log(`${status} ${table}: ${result.synced} synced, ${result.errors} errors`);
  }

  console.log('\n✨ Sync complete!');
  console.log('\nNote: auth_user_id columns were cleared to avoid FK constraint issues.');
  console.log('Landlords/vendors will need to be re-linked to auth users in dev if needed.');
}

main().catch(console.error);
