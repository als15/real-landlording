import { processAllFollowups } from '@/lib/followup/processor';

// Mock the external modules
jest.mock('@/lib/email/resend', () => ({
  resend: {
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  },
  FROM_EMAIL: 'test@test.com',
  NOTIFICATION_BCC_EMAIL: 'bcc@test.com',
  isEmailEnabled: true,
}));

jest.mock('@/lib/sms/twilio', () => ({
  twilioClient: {
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test-sid' }),
    },
  },
  FROM_PHONE: '+1234567890',
  isSmsEnabled: false, // Disable SMS in tests
}));

jest.mock('@/lib/followup/tokens', () => ({
  generateFollowupToken: jest.fn().mockReturnValue('mock-token-value'),
}));

// Set env vars for token generation
beforeAll(() => {
  process.env.FOLLOWUP_TOKEN_SECRET = 'test-secret-key-for-testing-only-32chars!!';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

function createMockSupabase(followups: Record<string, unknown>[] = []) {
  const matchData = {
    id: 'match-1',
    vendor: {
      id: 'vendor-1',
      contact_name: 'Test Vendor',
      business_name: 'Test Business',
      email: 'vendor@test.com',
      phone: '+1234567890',
    },
    request: {
      id: 'request-1',
      service_type: 'plumber_sewer',
      property_location: '19103',
      property_address: '123 Test St',
      landlord_name: 'Test Landlord',
      landlord_email: 'landlord@test.com',
      landlord_phone: '+1987654321',
      job_description: 'Fix a leak',
      urgency: 'medium',
    },
  };

  return {
    from: jest.fn((table: string) => {
      if (table === 'match_followups') {
        return {
          select: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({
                data: followups,
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'request_vendor_matches') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: matchData,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'followup_events') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    }),
  };
}

describe('processAllFollowups', () => {
  it('returns zero counts when no followups are pending', async () => {
    const supabase = createMockSupabase([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processAllFollowups(supabase as any);

    expect(result.processed).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('processes pending followups and sends Day 3 vendor check', async () => {
    const followups = [
      {
        id: 'followup-1',
        match_id: 'match-1',
        request_id: 'request-1',
        stage: 'pending',
        next_action_at: new Date().toISOString(),
      },
    ];
    const supabase = createMockSupabase(followups);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processAllFollowups(supabase as any);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('processes vendor_discussing followup and sends Day 7 recheck', async () => {
    const followups = [
      {
        id: 'followup-1',
        match_id: 'match-1',
        request_id: 'request-1',
        stage: 'vendor_discussing',
        next_action_at: new Date().toISOString(),
      },
    ];
    const supabase = createMockSupabase(followups);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processAllFollowups(supabase as any);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
  });

  it('processes awaiting_completion and sends completion check', async () => {
    const followups = [
      {
        id: 'followup-1',
        match_id: 'match-1',
        request_id: 'request-1',
        stage: 'awaiting_completion',
        next_action_at: new Date().toISOString(),
      },
    ];
    const supabase = createMockSupabase(followups);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processAllFollowups(supabase as any);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
  });

  it('handles errors gracefully', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processAllFollowups(supabase as any);

    expect(result.processed).toBe(0);
    expect(result.sent).toBe(0);
    expect(result.errors).toBe(0);
  });
});
