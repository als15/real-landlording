/**
 * Tests for admin authorization (verifyAdmin)
 */

// Mock next/server since jsdom doesn't have Request global
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

import { verifyAdmin } from '@/lib/api/admin';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;

function setupAuthMock(user: { id: string; email: string } | null, error: { message: string } | null = null) {
  mockedCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: user ? null : (error || { message: 'No user' }),
      }),
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function setupAdminMock(
  adminData: { id: string; role: string } | null = null,
  error: { message: string } | null = null
) {
  const mockSingle = jest.fn().mockResolvedValue({
    data: adminData,
    error: adminData ? null : (error || { message: 'Not found' }),
  });
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

  mockedCreateAdminClient.mockReturnValue({
    from: mockFrom,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return { mockFrom, mockSelect, mockEq, mockSingle };
}

describe('verifyAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    setupAuthMock(null);
    setupAdminMock();

    const result = await verifyAdmin();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.message).toContain('not authenticated');
    }
  });

  it('should return 403 when user is not an admin', async () => {
    setupAuthMock({ id: 'user-123', email: 'user@test.com' });
    setupAdminMock(null, { message: 'Not found' });

    const result = await verifyAdmin();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.message).toContain('admin access required');
    }
  });

  it('should return success context when user is a valid admin', async () => {
    setupAuthMock({ id: 'admin-123', email: 'admin@test.com' });
    setupAdminMock({ id: 'admin-row-1', role: 'admin' });

    const result = await verifyAdmin();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.context.userId).toBe('admin-123');
      expect(result.context.userEmail).toBe('admin@test.com');
      expect(result.context.adminRole).toBe('admin');
      expect(result.context.adminClient).toBeDefined();
    }
  });

  it('should check admin_users table', async () => {
    setupAuthMock({ id: 'admin-123', email: 'admin@test.com' });
    const { mockFrom, mockSelect, mockEq } = setupAdminMock({ id: 'admin-row-1', role: 'admin' });

    await verifyAdmin();

    expect(mockFrom).toHaveBeenCalledWith('admin_users');
    expect(mockSelect).toHaveBeenCalledWith('id, role');
    expect(mockEq).toHaveBeenCalledWith('auth_user_id', 'admin-123');
  });
});
