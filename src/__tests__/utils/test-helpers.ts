/**
 * Test utilities and helpers for Real Landlording tests
 */

// ============================================================================
// Request Mocking
// ============================================================================

export interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Create a mock request object for testing API routes
 * This returns a plain object that can be used in unit tests
 * For full NextRequest testing, use e2e tests with Playwright
 */
export function createMockRequest(options: MockRequestOptions) {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  return {
    method,
    url: urlObj.toString(),
    headers,
    body,
    searchParams: Object.fromEntries(urlObj.searchParams),
    json: async () => body,
  };
}

// ============================================================================
// Supabase Mocking
// ============================================================================

type MockQueryBuilder = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  lt: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  or: jest.Mock;
  and: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
};

/**
 * Create a chainable mock for Supabase query builder
 */
export function createMockQueryBuilder(
  resolvedValue: { data: unknown; error: unknown; count?: number }
): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
  };

  // Make most methods return the builder for chaining
  Object.keys(builder).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle') {
      (builder as Record<string, jest.Mock>)[key].mockReturnValue(builder);
    }
  });

  // Select at the end should resolve
  builder.select.mockImplementation(() => ({
    ...builder,
    then: (resolve: (value: typeof resolvedValue) => void) => resolve(resolvedValue),
  }));

  return builder;
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient(tableData: Record<string, { data: unknown; error: unknown }> = {}) {
  const defaultResponse = { data: null, error: null };

  return {
    from: jest.fn((table: string) => {
      const response = tableData[table] || defaultResponse;
      return createMockQueryBuilder(response);
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        updateUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://test.com/file' } }),
        remove: jest.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
}

// ============================================================================
// Test Data Factories
// ============================================================================

let idCounter = 0;
const generateId = () => `test-${++idCounter}-${Date.now()}`;

/**
 * Create a test service request
 */
export function createTestServiceRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId(),
    landlord_email: 'test@example.com',
    landlord_name: 'Test User',
    first_name: 'Test',
    last_name: 'User',
    landlord_phone: '2155551234',
    property_address: '123 Test St',
    zip_code: '19103',
    property_location: '123 Test St, 19103',
    service_type: 'plumber_sewer',
    job_description: 'Test job description',
    urgency: 'medium',
    status: 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test vendor
 */
export function createTestVendor(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId(),
    contact_name: 'Test Vendor',
    email: 'vendor@example.com',
    phone: '2155559999',
    business_name: 'Test Vendor LLC',
    services: ['plumber_sewer', 'hvac'],
    service_areas: ['19103', '19104', '19102'],
    status: 'active',
    licensed_insured: true,
    rental_experience: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test landlord
 */
export function createTestLandlord(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId(),
    email: 'landlord@example.com',
    name: 'Test Landlord',
    first_name: 'Test',
    last_name: 'Landlord',
    phone: '2155551111',
    request_count: 0,
    auth_user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test admin user
 */
export function createTestAdmin(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId(),
    auth_user_id: generateId(),
    email: 'admin@reallandlording.com',
    name: 'Test Admin',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a test match
 */
export function createTestMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: generateId(),
    request_id: generateId(),
    vendor_id: generateId(),
    status: 'pending',
    intro_sent_at: null,
    vendor_accepted_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Response Assertions
// ============================================================================

/**
 * Assert that a NextResponse has the expected status and body
 */
export async function assertResponse(
  response: Response,
  expectedStatus: number,
  bodyCheck?: (body: unknown) => void
) {
  expect(response.status).toBe(expectedStatus);

  if (bodyCheck) {
    const body = await response.json();
    bodyCheck(body);
  }
}

/**
 * Assert that a response is a successful JSON response
 */
export async function assertSuccessResponse(
  response: Response,
  expectedData?: Record<string, unknown>
) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);

  const body = await response.json();

  if (expectedData) {
    expect(body).toMatchObject(expectedData);
  }

  return body;
}

/**
 * Assert that a response is an error response
 */
export async function assertErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedMessage?: string
) {
  expect(response.status).toBe(expectedStatus);

  const body = await response.json();

  if (expectedMessage) {
    expect(body.message || body.error).toContain(expectedMessage);
  }

  return body;
}

// ============================================================================
// Reset helpers
// ============================================================================

/**
 * Reset the ID counter (useful between tests)
 */
export function resetIdCounter() {
  idCounter = 0;
}
