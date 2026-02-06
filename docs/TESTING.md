# Testing Guide

This document covers the testing strategy, tools, and patterns used in the Real Landlording platform.

## Overview

The platform uses a multi-layered testing approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Jest | Test business logic, utilities, validation |
| Integration Tests | Jest + Mocks | Test API routes with mocked database |
| E2E Tests | Playwright | Test full user flows in a browser |

## Quick Start

```bash
# Run all unit tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run all tests (unit + E2E)
npm run test:all

# Run pre-commit checks (lint, typecheck, tests)
npm run precommit
```

## Test Structure

```
src/
├── __tests__/
│   ├── unit/           # Unit tests
│   │   ├── api/        # API route validation tests
│   │   ├── scoring.test.ts
│   │   └── requestCount.test.ts
│   └── utils/          # Test utilities
│       └── test-helpers.ts
e2e/
├── request-submission.spec.ts
├── vendor-application.spec.ts
├── complete-flow.spec.ts
├── matching-flow.spec.ts
├── admin-flows.spec.ts
├── landlord-dashboard.spec.ts
└── vendor-dashboard.spec.ts
```

## Unit Testing with Jest

### Configuration

- Config: `jest.config.js`
- Setup: `jest.setup.js`
- Test pattern: `**/*.test.ts` or `**/*.test.tsx`

### Test Helpers

Import test utilities from `@/__tests__/utils/test-helpers`:

```typescript
import {
  createTestServiceRequest,
  createTestVendor,
  createTestLandlord,
  createMockSupabaseClient,
  createMockRequest,
} from '@/__tests__/utils/test-helpers';
```

### Example: Testing Business Logic

```typescript
import { calculateVendorScore } from '@/lib/scoring';

describe('Vendor Scoring', () => {
  it('should increase score for 5-star reviews', () => {
    const metrics = {
      vendorId: 'test-1',
      reviews: [{ rating: 5, createdAt: new Date() }],
      // ... other metrics
    };

    const result = calculateVendorScore(metrics);
    expect(result.score).toBeGreaterThan(50);
  });
});
```

### Example: Testing Validation

```typescript
describe('Service Request Validation', () => {
  it('should require landlord email', () => {
    const result = validateServiceRequestInput({
      first_name: 'Test',
      // missing landlord_email
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: landlord_email');
  });
});
```

### Mocking Supabase

Use `createMockSupabaseClient` for database operations:

```typescript
import { createMockSupabaseClient } from '@/__tests__/utils/test-helpers';

const mockClient = createMockSupabaseClient({
  vendors: {
    data: [{ id: '1', business_name: 'Test Vendor' }],
    error: null,
  },
});

// Mock the supabase module
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}));
```

## E2E Testing with Playwright

### Configuration

- Config: `playwright.config.ts`
- Test directory: `e2e/`
- Base URL: `http://localhost:3001` (or `PLAYWRIGHT_BASE_URL`)

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/request-submission.spec.ts
```

### Example: Testing API Endpoints

```typescript
import { test, expect } from '@playwright/test';

test('should submit request successfully', async ({ request }) => {
  const response = await request.post('/api/requests', {
    data: {
      landlord_email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      service_type: 'plumber_sewer',
      property_address: '123 Test St',
      zip_code: '19103',
      job_description: 'Fix leaky faucet',
      urgency: 'medium',
      is_owner: true,
    },
  });

  expect([200, 201]).toContain(response.status());
  const data = await response.json();
  expect(data.id).toBeDefined();
});
```

### Example: Testing UI Flows

```typescript
test('should navigate through multi-step form', async ({ page }) => {
  await page.goto('/request');

  // Fill first step
  await page.fill('input[name="first_name"]', 'Test');
  await page.fill('input[name="last_name"]', 'User');
  await page.fill('input[type="email"]', 'test@example.com');

  // Click next
  await page.click('button:has-text("Next")');

  // Verify advancement to next step
  await expect(page.locator('text=Service Type')).toBeVisible();
});
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and PR:

1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Unit Tests** - Jest with coverage reporting
3. **Build** - Next.js production build
4. **E2E Tests** - Playwright (main branch or `run-e2e` label)

### Required Secrets

For E2E tests in CI, configure these GitHub secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CODECOV_TOKEN` (optional, for coverage)

## Coverage Thresholds

Current thresholds (in `jest.config.js`):

| Scope | Statements | Branches | Functions | Lines |
|-------|------------|----------|-----------|-------|
| Global | 1% | 0% | 1% | 1% |
| `scoring/calculate.ts` | 80% | 70% | 75% | 80% |

Thresholds are intentionally low to start and should be increased as coverage improves.

## Best Practices

### What to Test

1. **Business Logic** - Scoring algorithms, validation rules, calculations
2. **API Endpoints** - Request/response handling, error cases
3. **Critical User Flows** - Request submission, vendor application, matching
4. **Edge Cases** - Empty inputs, invalid data, error scenarios

### What NOT to Test (with unit tests)

1. Framework behavior (Next.js routing, React rendering)
2. External services (Supabase, Resend, Twilio) - mock these
3. Simple UI components without logic
4. Database schema (use E2E or integration tests)

### Naming Conventions

```typescript
// Test file: src/__tests__/unit/scoring.test.ts
describe('Vendor Scoring System', () => {
  describe('Review scoring', () => {
    it('should increase score for 5-star reviews', () => {
      // test implementation
    });
  });
});
```

### Test Data

Use factory functions for consistent test data:

```typescript
const vendor = createTestVendor({
  status: 'active',
  services: ['plumber_sewer'],
});

const request = createTestServiceRequest({
  urgency: 'emergency',
  zip_code: '19103',
});
```

## Troubleshooting

### Tests timing out

Increase timeout in test or config:
```typescript
test('slow operation', async () => {
  // ...
}, 30000); // 30 second timeout
```

### Mock not working

Ensure mocks are defined before imports:
```typescript
jest.mock('@/lib/supabase/server');
// Then import the module that uses it
import { createAdminClient } from '@/lib/supabase/server';
```

### E2E tests failing in CI

1. Check if environment variables are set
2. Ensure build artifacts are available
3. Review Playwright traces in GitHub Actions artifacts

## Adding New Tests

1. Create test file in appropriate directory
2. Import test helpers as needed
3. Follow existing patterns for consistency
4. Run `npm run test:watch` during development
5. Ensure coverage meets thresholds before committing
