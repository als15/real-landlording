/**
 * Email Verification Fixture for E2E Tests
 *
 * Provides functions to verify that emails were sent via the Resend API.
 * Uses the Resend API to check for recently sent emails.
 */

// ============================================================================
// Types
// ============================================================================

export interface EmailRecord {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string;
}

export interface EmailVerificationResult {
  found: boolean;
  email?: EmailRecord;
  error?: string;
}

// ============================================================================
// Resend API Functions
// ============================================================================

const RESEND_API_BASE = 'https://api.resend.com';

/**
 * Get Resend API key from environment
 */
function getResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required for email verification');
  }
  return apiKey;
}

/**
 * Fetch recent emails from Resend API
 * Note: Resend's API may not support listing emails in all plans.
 * If not available, we'll use a fallback approach.
 */
export async function getRecentEmails(): Promise<EmailRecord[]> {
  const apiKey = getResendApiKey();

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Resend may not support listing emails on all plans
      console.warn(`Resend API returned ${response.status}: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.warn('Failed to fetch emails from Resend:', error);
    return [];
  }
}

/**
 * Get a specific email by ID
 */
export async function getEmailById(emailId: string): Promise<EmailRecord | null> {
  const apiKey = getResendApiKey();

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails/${emailId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch email from Resend:', error);
    return null;
  }
}

// ============================================================================
// Email Verification Functions
// ============================================================================

/**
 * Verify that an email was sent to a specific address with matching subject
 *
 * @param toEmail - The recipient email address
 * @param subjectContains - Substring to match in the email subject
 * @param options - Additional options
 * @returns The email record if found
 * @throws Error if email not found within timeout
 */
export async function verifyEmailSent(
  toEmail: string,
  subjectContains: string,
  options: {
    timeout?: number;
    pollInterval?: number;
    since?: Date;
  } = {}
): Promise<EmailRecord> {
  const timeout = options.timeout || 15000;
  const pollInterval = options.pollInterval || 2000;
  const since = options.since || new Date(Date.now() - 60000); // Default: last minute

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const emails = await getRecentEmails();

    const matchingEmail = emails.find((email) => {
      // Check recipient
      const hasRecipient = email.to.some((recipient) =>
        recipient.toLowerCase().includes(toEmail.toLowerCase())
      );

      // Check subject
      const hasSubject = email.subject.toLowerCase().includes(subjectContains.toLowerCase());

      // Check timing
      const emailDate = new Date(email.created_at);
      const isRecent = emailDate >= since;

      return hasRecipient && hasSubject && isRecent;
    });

    if (matchingEmail) {
      return matchingEmail;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Email not found within ${timeout}ms: to="${toEmail}" subject contains "${subjectContains}"`
  );
}

/**
 * Verify that an email was sent (non-throwing version)
 * Returns a result object instead of throwing
 */
export async function checkEmailSent(
  toEmail: string,
  subjectContains: string,
  options: {
    timeout?: number;
    pollInterval?: number;
    since?: Date;
  } = {}
): Promise<EmailVerificationResult> {
  try {
    const email = await verifyEmailSent(toEmail, subjectContains, options);
    return { found: true, email };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wait for multiple emails to be sent
 */
export async function verifyMultipleEmailsSent(
  expectations: Array<{ to: string; subjectContains: string }>,
  options: {
    timeout?: number;
    since?: Date;
  } = {}
): Promise<EmailRecord[]> {
  const results: EmailRecord[] = [];

  for (const expectation of expectations) {
    const email = await verifyEmailSent(expectation.to, expectation.subjectContains, options);
    results.push(email);
  }

  return results;
}

// ============================================================================
// Email Type Helpers
// ============================================================================

/**
 * Verify request confirmation email was sent
 */
export async function verifyRequestConfirmationEmail(
  landlordEmail: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord> {
  return verifyEmailSent(landlordEmail, 'request', {
    timeout: options.timeout || 15000,
  });
}

/**
 * Verify intro email was sent to landlord
 */
export async function verifyLandlordIntroEmail(
  landlordEmail: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord> {
  return verifyEmailSent(landlordEmail, 'matched', {
    timeout: options.timeout || 15000,
  });
}

/**
 * Verify intro email was sent to vendor
 */
export async function verifyVendorIntroEmail(
  vendorEmail: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord> {
  return verifyEmailSent(vendorEmail, 'lead', {
    timeout: options.timeout || 15000,
  });
}

/**
 * Verify vendor welcome email was sent
 */
export async function verifyVendorWelcomeEmail(
  vendorEmail: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord> {
  return verifyEmailSent(vendorEmail, 'Welcome', {
    timeout: options.timeout || 15000,
  });
}

/**
 * Verify password reset email was sent
 */
export async function verifyPasswordResetEmail(
  userEmail: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord> {
  return verifyEmailSent(userEmail, 'Reset', {
    timeout: options.timeout || 15000,
  });
}

/**
 * Verify vendor application received email was sent
 */
export async function verifyVendorApplicationEmail(
  vendorEmail: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord> {
  return verifyEmailSent(vendorEmail, 'application', {
    timeout: options.timeout || 15000,
  });
}

// ============================================================================
// Fallback: Database Email Logging (if Resend API doesn't support listing)
// ============================================================================

/**
 * If your app logs emails to the database, you can use this function instead.
 * Requires an `email_logs` table with columns: id, to_email, subject, created_at
 */
export async function verifyEmailSentViaDatabase(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          ilike: (column: string, pattern: string) => {
            gte: (column: string, date: string) => {
              single: () => Promise<{ data: EmailRecord | null; error: Error | null }>;
            };
          };
        };
      };
    };
  },
  toEmail: string,
  subjectContains: string,
  since: Date
): Promise<EmailRecord | null> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('to_email', toEmail)
    .ilike('subject', `%${subjectContains}%`)
    .gte('created_at', since.toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Skip email verification if Resend API is not configured
 */
export function isEmailVerificationEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Conditionally verify email - skips if API not available
 */
export async function maybeVerifyEmailSent(
  toEmail: string,
  subjectContains: string,
  options: { timeout?: number } = {}
): Promise<EmailRecord | null> {
  if (!isEmailVerificationEnabled()) {
    console.log(
      `Skipping email verification (no RESEND_API_KEY): ${subjectContains} to ${toEmail}`
    );
    return null;
  }

  return verifyEmailSent(toEmail, subjectContains, options);
}
