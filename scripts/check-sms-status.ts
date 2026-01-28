// Check SMS status
// Run with: npx tsx scripts/check-sms-status.ts SM69e71036453d87758f392f393b97a6f6

import { config } from 'dotenv';
config({ path: '.env.local' });

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messageSid = process.argv[2] || 'SM69e71036453d87758f392f393b97a6f6';

const client = twilio(accountSid, authToken);

async function checkStatus() {
  try {
    const message = await client.messages(messageSid).fetch();

    console.log('Message Details:');
    console.log(`  SID: ${message.sid}`);
    console.log(`  Status: ${message.status}`);
    console.log(`  To: ${message.to}`);
    console.log(`  From: ${message.from}`);
    console.log(`  Date Sent: ${message.dateSent}`);
    console.log(`  Error Code: ${message.errorCode || 'none'}`);
    console.log(`  Error Message: ${message.errorMessage || 'none'}`);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkStatus();
