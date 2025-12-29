import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'Real Landlording <onboarding@resend.dev>';

if (!apiKey) {
  console.error('❌ RESEND_API_KEY is not set');
  process.exit(1);
}

console.log('✓ RESEND_API_KEY is configured');
console.log(`✓ FROM_EMAIL: ${fromEmail}`);

const resend = new Resend(apiKey);

async function testResend() {
  // Get test email from command line or use default
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.log('\nUsage: npx tsx scripts/test-resend.ts <your-email@example.com>');
    console.log('\nNo email provided - testing API connection only...\n');

    // Just verify API key works by attempting to get API key info
    try {
      // Send to Resend's test address (doesn't actually deliver)
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: 'delivered@resend.dev', // Resend's test address
        subject: 'Test Email - Real Landlording',
        html: '<p>This is a test email to verify Resend integration.</p>',
      });

      if (error) {
        console.error('❌ Resend API error:', error);
        process.exit(1);
      }

      console.log('✓ Resend API connection successful!');
      console.log(`✓ Test email ID: ${data?.id}`);
    } catch (err) {
      console.error('❌ Failed to connect to Resend:', err);
      process.exit(1);
    }
    return;
  }

  console.log(`\nSending test email to: ${testEmail}\n`);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: 'Test Email - Real Landlording Integration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 24px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 8px 8px; }
            .success { background: #f6ffed; border: 1px solid #b7eb8f; padding: 16px; border-radius: 4px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Real Landlording</h1>
              <p style="margin: 8px 0 0;">Email Integration Test</p>
            </div>
            <div class="content">
              <div class="success">
                <strong>✓ Success!</strong> Your Resend integration is working correctly.
              </div>
              <p>This test email confirms that:</p>
              <ul>
                <li>Your RESEND_API_KEY is valid</li>
                <li>Your FROM_EMAIL (${fromEmail}) is configured</li>
                <li>Emails can be sent from your application</li>
              </ul>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                Sent at: ${new Date().toISOString()}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      process.exit(1);
    }

    console.log('✓ Email sent successfully!');
    console.log(`✓ Email ID: ${data?.id}`);
    console.log('\nCheck your inbox (and spam folder) for the test email.');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testResend();
