import { handleFollowupResponse } from '@/lib/followup/handler';

// Mock supabase client
function createMockSupabase(followupData: Record<string, unknown> | null = null) {
  const insertedRows: Record<string, unknown>[] = [];
  const updatedRows: Record<string, unknown>[] = [];

  const mockClient = {
    from: jest.fn((table: string) => {
      if (table === 'match_followups') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: followupData,
                error: followupData ? null : { message: 'Not found' },
              }),
            }),
          }),
          update: jest.fn((data: Record<string, unknown>) => {
            updatedRows.push({ table, ...data });
            return {
              eq: jest.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === 'request_vendor_matches') {
        return {
          update: jest.fn((data: Record<string, unknown>) => {
            updatedRows.push({ table, ...data });
            return {
              eq: jest.fn().mockResolvedValue({ error: null }),
            };
          }),
        };
      }
      if (table === 'followup_events') {
        return {
          insert: jest.fn((data: Record<string, unknown>) => {
            insertedRows.push({ table, ...data });
            return Promise.resolve({ error: null });
          }),
        };
      }
      if (table === 'notifications') {
        return {
          insert: jest.fn((data: Record<string, unknown>) => {
            insertedRows.push({ table, ...data });
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null }),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    _insertedRows: insertedRows,
    _updatedRows: updatedRows,
  };

  return mockClient;
}

const baseFollowup = {
  id: 'followup-1',
  match_id: 'match-1',
  request_id: 'request-1',
  vendor_response_token: 'token-vendor',
  landlord_response_token: 'token-landlord',
};

describe('handleFollowupResponse', () => {
  describe('vendor: booked', () => {
    it('transitions from vendor_check_sent to timeline_requested', async () => {
      const followup = { ...baseFollowup, stage: 'vendor_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'booked', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('timeline_requested');
      expect(result.message).toContain('booked');
    });

    it('rejects booked from invalid stage', async () => {
      const followup = { ...baseFollowup, stage: 'pending' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'booked', 'vendor');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot mark as booked');
    });
  });

  describe('vendor: discussing', () => {
    it('transitions from vendor_check_sent to vendor_discussing', async () => {
      const followup = { ...baseFollowup, stage: 'vendor_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'discussing', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('vendor_discussing');
    });
  });

  describe('vendor: cant_reach', () => {
    it('transitions to landlord_check_sent', async () => {
      const followup = { ...baseFollowup, stage: 'vendor_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'cant_reach', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('landlord_check_sent');
    });
  });

  describe('vendor: no_deal', () => {
    it('transitions to needs_rematch and creates admin notification', async () => {
      const followup = { ...baseFollowup, stage: 'vendor_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'no_deal', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('needs_rematch');
    });
  });

  describe('landlord: contact_ok', () => {
    it('transitions from landlord_check_sent to landlord_contact_ok', async () => {
      const followup = { ...baseFollowup, stage: 'landlord_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'contact_ok', 'landlord');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('landlord_contact_ok');
    });
  });

  describe('landlord: no_contact', () => {
    it('transitions to needs_rematch', async () => {
      const followup = { ...baseFollowup, stage: 'landlord_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'no_contact', 'landlord');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('needs_rematch');
    });
  });

  describe('completion: completed', () => {
    it('transitions from completion_check_sent to invoice_requested', async () => {
      const followup = { ...baseFollowup, stage: 'completion_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'completed', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('invoice_requested');
    });
  });

  describe('completion: in_progress', () => {
    it('transitions to timeline_requested for new timeline', async () => {
      const followup = { ...baseFollowup, stage: 'completion_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'in_progress', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('timeline_requested');
    });
  });

  describe('completion: cancelled', () => {
    it('transitions to cancellation_reason_requested', async () => {
      const followup = { ...baseFollowup, stage: 'completion_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'cancelled', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('cancellation_reason_requested');
    });
  });

  describe('timeline responses', () => {
    it('transitions from timeline_requested to awaiting_completion', async () => {
      const followup = { ...baseFollowup, stage: 'timeline_requested' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'timeline_3_5_days', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('awaiting_completion');
    });

    it('rejects unknown timeline action', async () => {
      const followup = { ...baseFollowup, stage: 'timeline_requested' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'timeline_invalid', 'vendor');

      expect(result.success).toBe(false);
    });
  });

  describe('invoice responses', () => {
    it('transitions from invoice_requested to feedback_requested', async () => {
      const followup = { ...baseFollowup, stage: 'invoice_requested' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'invoice_1000_2500', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('feedback_requested');
    });
  });

  describe('cancellation reason responses', () => {
    it('transitions from cancellation_reason_requested to needs_rematch', async () => {
      const followup = { ...baseFollowup, stage: 'cancellation_reason_requested' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'cancel_reason_price', 'vendor');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('needs_rematch');
    });
  });

  describe('feedback responses', () => {
    it('transitions from feedback_requested to closed', async () => {
      const followup = { ...baseFollowup, stage: 'feedback_requested' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'feedback_great', 'landlord');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('closed');
    });
  });

  describe('unknown action', () => {
    it('returns error for unknown action', async () => {
      const followup = { ...baseFollowup, stage: 'vendor_check_sent' };
      const supabase = createMockSupabase(followup);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'unknown_action', 'vendor');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown action');
    });
  });

  describe('missing followup', () => {
    it('returns error when followup not found', async () => {
      const supabase = createMockSupabase(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'nonexistent', 'booked', 'vendor');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('admin override', () => {
    it('allows admin to bypass stage validation', async () => {
      const followup = { ...baseFollowup, stage: 'pending' };
      const supabase = createMockSupabase(followup);

      // Admin can mark as booked from any stage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await handleFollowupResponse(supabase as any, 'followup-1', 'booked', 'admin', 'admin-user-1');

      expect(result.success).toBe(true);
      expect(result.newStage).toBe('timeline_requested');
    });
  });
});
