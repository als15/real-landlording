// Quick SMS test script (Telnyx)
// Run with: npx tsx scripts/test-sms.ts +1234567890

import { config } from 'dotenv';
config({ path: '.env.local' });

import Telnyx from 'telnyx';

const apiKey = process.env.TELNYX_API_KEY;
const fromNumber = process.env.TELNYX_PHONE_NUMBER;

const phoneArg = process.argv[2];

if (!phoneArg) {
  console.error('Usage: npx tsx scripts/test-sms.ts +1234567890');
  console.error('       (use your phone number to receive the test SMS)');
  process.exit(1);
}

if (!apiKey || !fromNumber) {
  console.error('Missing Telnyx credentials in .env.local:');
  console.error(`  TELNYX_API_KEY: ${apiKey ? 'set' : 'missing'}`);
  console.error(`  TELNYX_PHONE_NUMBER: ${fromNumber ? 'set' : 'missing'}`);
  process.exit(1);
}

console.log('Telnyx credentials found:');
console.log(`  From Number: ${fromNumber}`);
console.log(`  To Number: ${phoneArg}`);
console.log('');

const client = new Telnyx({ apiKey });

async function sendTestSms() {
  try {
    const response = await client.messages.send({
      from: fromNumber,
      to: phoneArg,
      text: 'Real Landlording: SMS test successful! Your notifications are now configured.',
      type: 'SMS',
    });

    console.log('SMS sent successfully!');
    console.log(`  Message ID: ${response.data?.id}`);
  } catch (error: unknown) {
    console.error('SMS failed:');
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

sendTestSms();
