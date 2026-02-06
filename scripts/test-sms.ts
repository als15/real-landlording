// Quick SMS test script
// Run with: npx tsx scripts/test-sms.ts +1234567890

import { config } from 'dotenv';
config({ path: '.env.local' });

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const phoneArg = process.argv[2];

if (!phoneArg) {
  console.error('Usage: npx tsx scripts/test-sms.ts +1234567890');
  console.error('       (use your phone number to receive the test SMS)');
  process.exit(1);
}

if (!accountSid || !authToken || !fromNumber) {
  console.error('Missing Twilio credentials in .env.local:');
  console.error(`  TWILIO_ACCOUNT_SID: ${accountSid ? '✓' : '✗ missing'}`);
  console.error(`  TWILIO_AUTH_TOKEN: ${authToken ? '✓' : '✗ missing'}`);
  console.error(`  TWILIO_PHONE_NUMBER: ${fromNumber ? '✓' : '✗ missing'}`);
  process.exit(1);
}

console.log('Twilio credentials found:');
console.log(`  Account SID: ${accountSid.substring(0, 10)}...`);
console.log(`  From Number: ${fromNumber}`);
console.log(`  To Number: ${phoneArg}`);
console.log('');

const client = twilio(accountSid, authToken);

async function sendTestSms() {
  try {
    const message = await client.messages.create({
      body: 'Real Landlording: SMS test successful! Your notifications are now configured.',
      from: fromNumber,
      to: phoneArg,
    });

    console.log('✓ SMS sent successfully!');
    console.log(`  Message SID: ${message.sid}`);
    console.log(`  Status: ${message.status}`);
  } catch (error: any) {
    console.error('✗ SMS failed:');
    console.error(`  Error: ${error.message}`);
    if (error.code) {
      console.error(`  Code: ${error.code}`);
    }
  }
}

sendTestSms();
