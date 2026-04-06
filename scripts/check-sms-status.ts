// Check SMS delivery status (Telnyx)
// Run with: npx tsx scripts/check-sms-status.ts <message-id>

import { config } from 'dotenv';
config({ path: '.env.local' });

import Telnyx from 'telnyx';

const apiKey = process.env.TELNYX_API_KEY;
const messageId = process.argv[2];

if (!messageId) {
  console.error('Usage: npx tsx scripts/check-sms-status.ts <message-id>');
  process.exit(1);
}

if (!apiKey) {
  console.error('Missing TELNYX_API_KEY in .env.local');
  process.exit(1);
}

const client = new Telnyx({ apiKey });

async function checkStatus() {
  try {
    const message = await client.messages.retrieve(messageId);

    console.log('Message Details:');
    console.log(`  ID: ${message.data?.id}`);
    console.log(`  To: ${message.data?.to?.[0]?.phone_number || 'unknown'}`);
    console.log(`  From: ${message.data?.from?.phone_number || 'unknown'}`);
    console.log(`  Completed At: ${message.data?.completed_at || 'pending'}`);
  } catch (error: unknown) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

checkStatus();
