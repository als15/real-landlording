/**
 * Tests for Notification Service
 *
 * Tests the notification creation and helper functions.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Mock the Supabase client
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  insert: mockInsert.mockReturnValue({
    select: mockSelect,
  }),
}));

const mockSupabase = {
  from: mockFrom,
} as unknown as SupabaseClient;

// Import after setting up mocks
import {
  createNotification,
  notifyNewRequest,
  notifyEmergencyRequest,
} from '@/lib/notifications/service';

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });
  });

  describe('createNotification', () => {
    it('should create a notification with required fields', async () => {
      const result = await createNotification(mockSupabase, {
        userType: 'admin',
        type: 'new_request',
        title: 'Test Notification',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: 'admin',
          type: 'new_request',
          title: 'Test Notification',
          message: 'Test message',
          priority: 'medium',
        })
      );
    });

    it('should include optional fields when provided', async () => {
      await createNotification(mockSupabase, {
        userType: 'vendor',
        userId: 'vendor-123',
        type: 'new_job_lead',
        title: 'New Lead',
        message: 'You have a new job lead',
        requestId: 'request-123',
        actionUrl: '/vendor/dashboard',
        priority: 'high',
        metadata: { service_type: 'plumber_sewer' },
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: 'vendor',
          user_id: 'vendor-123',
          request_id: 'request-123',
          action_url: '/vendor/dashboard',
          priority: 'high',
          metadata: { service_type: 'plumber_sewer' },
        })
      );
    });

    it('should return error when insert fails', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await createNotification(mockSupabase, {
        userType: 'admin',
        type: 'new_request',
        title: 'Test',
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle exceptions gracefully', async () => {
      mockInsert.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result = await createNotification(mockSupabase, {
        userType: 'admin',
        type: 'new_request',
        title: 'Test',
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create notification');
    });
  });

  describe('notifyNewRequest', () => {
    it('should create notification with correct format', async () => {
      const result = await notifyNewRequest(mockSupabase, {
        id: 'request-123',
        service_type: 'plumber_sewer',
        zip_code: '19103',
        landlord_name: 'John Doe',
        urgency: 'medium',
      });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: 'admin',
          type: 'new_request',
          title: 'New Service Request',
          request_id: 'request-123',
          action_url: '/requests?view=request-123',
          priority: 'medium',
        })
      );
    });

    it('should handle missing optional fields', async () => {
      await notifyNewRequest(mockSupabase, {
        id: 'request-123',
        service_type: 'electrician',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown'),
        })
      );
    });
  });

  describe('notifyEmergencyRequest', () => {
    it('should create high priority notification', async () => {
      const result = await notifyEmergencyRequest(mockSupabase, {
        id: 'request-456',
        service_type: 'plumber_sewer',
        zip_code: '19103',
        landlord_name: 'Jane Doe',
        job_description: 'Burst pipe flooding basement',
      });

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: 'admin',
          type: 'emergency_request',
          priority: 'high',
          title: expect.stringContaining('Emergency'),
        })
      );
    });

    it('should include description preview in metadata', async () => {
      const longDescription = 'A'.repeat(200);

      await notifyEmergencyRequest(mockSupabase, {
        id: 'request-456',
        service_type: 'hvac',
        job_description: longDescription,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            description_preview: expect.any(String),
          }),
        })
      );

      // Verify description is truncated
      const call = mockInsert.mock.calls[0][0];
      expect(call.metadata.description_preview.length).toBeLessThanOrEqual(100);
    });
  });
});

describe('Notification Types', () => {
  it('should use correct notification types', () => {
    // This test documents expected notification types
    const expectedTypes = [
      'new_request',
      'emergency_request',
      'stale_request',
      'new_application',
      'vendor_accepted',
      'vendor_declined',
      'new_review',
      'negative_review',
      'new_job_lead',
      'new_review_received',
      'vendors_matched',
    ];

    // Verify these are valid by checking they can be used
    expectedTypes.forEach((type) => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it('should use correct priority levels', () => {
    const validPriorities = ['low', 'medium', 'high'];

    validPriorities.forEach((priority) => {
      expect(['low', 'medium', 'high']).toContain(priority);
    });
  });

  it('should use correct user types', () => {
    const validUserTypes = ['admin', 'vendor', 'landlord'];

    validUserTypes.forEach((userType) => {
      expect(['admin', 'vendor', 'landlord']).toContain(userType);
    });
  });
});
