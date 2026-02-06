import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.development.local (takes precedence in dev mode)
dotenv.config({ path: resolve(process.cwd(), '.env.development.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key exists:', !!serviceRoleKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Test 1: Check if notifications table exists
  const { data: tableCheck, error: tableError } = await supabase
    .from('notifications')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('Table check error:', tableError.message);
    console.error('Full error:', JSON.stringify(tableError, null, 2));
    return;
  } else {
    console.log('Notifications table exists! Found', tableCheck?.length || 0, 'existing notifications');
  }

  // Test 2: Try to insert a test notification
  console.log('\nTrying to insert test notification...');
  const { data: insertData, error: insertError } = await supabase
    .from('notifications')
    .insert({
      user_type: 'admin',
      type: 'new_request',
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'medium',
      metadata: {},
    })
    .select();

  if (insertError) {
    console.error('Insert error:', insertError.message);
    console.error('Full error:', JSON.stringify(insertError, null, 2));
  } else {
    console.log('Successfully inserted notification:', insertData);
    console.log('Keeping test notification for verification');
  }

  // Test 3: Count all notifications
  const { count, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Count error:', countError.message);
  } else {
    console.log('\nTotal notifications in database:', count);
  }

  // Test 4: List all admin notifications
  const { data: allNotifications, error: listError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_type', 'admin')
    .order('created_at', { ascending: false })
    .limit(10);

  if (listError) {
    console.error('List error:', listError.message);
  } else {
    console.log('\nRecent admin notifications:');
    allNotifications?.forEach((n) => {
      console.log(`  - [${n.type}] ${n.title}: ${n.message} (created: ${n.created_at})`);
    });
  }
}

main().catch(console.error);
