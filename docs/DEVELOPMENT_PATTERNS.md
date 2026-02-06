# Development Patterns & Solutions

This document captures recurring patterns, common issues, and their solutions to avoid repeating mistakes.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Git Branching Workflow](#git-branching-workflow)
3. [Supabase Authentication & Authorization](#supabase-authentication--authorization)
4. [Row Level Security (RLS) Patterns](#row-level-security-rls-patterns)
5. [API Route Patterns](#api-route-patterns)
6. [Common Issues & Solutions](#common-issues--solutions)

---

## Development Environment Setup

### Overview

This project uses **separate databases** for development and production to prevent accidental data corruption:

| Environment | Database | Deploy Target | Credentials |
|-------------|----------|---------------|-------------|
| Local dev | Dev Supabase | localhost:3000 | `.env.development.local` |
| PR Preview | Dev Supabase | Vercel preview URL | Vercel Preview env vars |
| Production | Prod Supabase | reallandlording.com | Vercel Production env vars |

### Getting Started (New Developer)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd real-landlording
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.development.local
   ```
   Ask the team lead for the DEV Supabase credentials and fill them in.

4. **Seed the development database (optional):**
   ```bash
   npm run seed:dev
   ```
   This creates test users you can log in with:
   - Admin: `admin@test.dev` / `TestAdmin123!`
   - Landlord: `landlord1@test.dev` / `TestLandlord123!`
   - Vendor: `plumber@test.dev` / `TestVendor123!`

5. **Run the development server:**
   ```bash
   npm run dev
   ```

### Environment Variables

See `.env.local.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, bypasses RLS) |
| `RESEND_API_KEY` | Email service API key |
| `SKIP_SMS` | Set to `true` in dev to skip Twilio SMS |

### Database Migrations

Migrations are stored in `supabase/migrations/` and numbered sequentially.

**Running migrations on a new database:**

Option A - Supabase CLI:
```bash
supabase db push --db-url "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

Option B - Manual via SQL Editor:
1. Go to Supabase Dashboard > SQL Editor
2. Run each migration file in order (001, 002, ... 012)

### PR Preview Deployments

When you push a PR, Vercel automatically creates a preview deployment that:
- Uses the **dev database** (not production)
- Has a unique URL like `real-landlording-xyz-123.vercel.app`
- Is safe to test with real flows

### Branch Protection

The `main` branch has these protections:
- Requires a pull request (no direct commits)
- Requires CI checks to pass (lint, typecheck, tests, build)
- Requires at least 1 approval from a reviewer

---

---

## Git Branching Workflow

### Branch Strategy

**All development work must be done on feature branches.** Never commit directly to `main`.

```
main (production-ready)
  │
  ├── feature/docusign-sla-integration
  ├── feature/vendor-dashboard-redesign
  ├── fix/login-redirect-bug
  └── ...
```

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| New feature | `feature/<description>` | `feature/docusign-sla-integration` |
| Bug fix | `fix/<description>` | `fix/vendor-email-validation` |
| Refactor | `refactor/<description>` | `refactor/api-error-handling` |
| Documentation | `docs/<description>` | `docs/api-documentation` |

### Workflow

1. **Create feature branch from main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop and commit on feature branch:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **When feature is complete, merge to main:**
   ```bash
   git checkout main
   git pull origin main
   git merge feature/your-feature-name
   git push origin main
   ```

4. **Clean up feature branch (optional):**
   ```bash
   git branch -d feature/your-feature-name
   ```

### Rules

- ✅ Always create a feature branch for new work
- ✅ Keep feature branches focused on a single feature/fix
- ✅ Test thoroughly before merging to main
- ❌ Never commit directly to main
- ❌ Don't let feature branches get stale (merge or delete)

---

## Supabase Authentication & Authorization

### Authentication Architecture

This project uses **Supabase Auth** for authentication. Key points:

- **Passwords are stored in Supabase Auth**, NOT in the `landlords` or `vendors` tables
- The `landlords` and `vendors` tables have an `auth_user_id` column that links to `auth.users(id)`
- Users can exist in `landlords`/`vendors` tables without an `auth_user_id` (e.g., from form submissions before signup)

### Two Supabase Clients

Located in `src/lib/supabase/server.ts`:

| Client | Function | When to Use |
|--------|----------|-------------|
| `createClient()` | Standard client with RLS | When you want RLS policies to apply (rare in API routes) |
| `createAdminClient()` | Service role client, bypasses RLS | **Most API routes** - when you handle authorization manually |

### Password Operations

**CORRECT** - Use Supabase Auth admin API:
```typescript
const supabase = createAdminClient();
const { error } = await supabase.auth.admin.updateUserById(
  userData.auth_user_id,
  { password: newPassword }
);
```

**WRONG** - Do NOT try to update a `password` column in database tables:
```typescript
// This will fail - there is no password column!
await supabase.from('landlords').update({ password: hashedPassword })
```

---

## Row Level Security (RLS) Patterns

### Current RLS Setup

All main tables have RLS enabled:
- `landlords`
- `vendors`
- `service_requests`
- `request_vendor_matches`
- `admin_users`

### Policy Summary

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|-------|------|--------|--------|--------|--------|
| `landlords` | Admin | ✅ | ✅ | ✅ | ✅ |
| `landlords` | Own user | ✅ | ✅ | ✅ | ❌ |
| `landlords` | Anon | ✅ | ✅ | ✅ | ❌ |
| `vendors` | Admin | ✅ | ✅ | ✅ | ✅ |
| `vendors` | Own user | ✅ | ❌ | ✅ | ❌ |
| `service_requests` | Admin | ✅ | ✅ | ✅ | ✅ |
| `service_requests` | Landlord (own) | ✅ | ✅ | ❌ | ❌ |
| `service_requests` | Anon | ❌ | ✅ | ❌ | ❌ |
| `request_vendor_matches` | Admin | ✅ | ✅ | ✅ | ✅ |
| `request_vendor_matches` | Vendor (own) | ✅ | ❌ | ❌ | ❌ |
| `request_vendor_matches` | Landlord (own) | ✅ | ❌ | ✅ | ❌ |

### Common RLS Issue: "Not Found" When Record Exists

**Symptom:** API returns 404 "not found" but the record exists in the database.

**Cause:** RLS is blocking access because there's no policy for the user type/operation.

**Solution:** Either:
1. Add the missing RLS policy (if it should be allowed at DB level)
2. Use `createAdminClient()` and handle authorization in code (preferred for API routes)

### Best Practice: API Routes Should Use Admin Client

For API routes, prefer using `createAdminClient()` with manual authorization checks:

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user with standard client
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // 2. Use admin client for database operations
  const adminClient = createAdminClient();

  // 3. Fetch data without RLS restrictions
  const { data, error } = await adminClient
    .from('some_table')
    .select('*')
    .eq('id', someId)
    .single();

  // 4. Manually verify ownership/authorization
  if (data.owner_id !== user.id) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // 5. Proceed with operation
  // ...
}
```

**Why this pattern?**
- RLS policies are complex and easy to miss edge cases
- Manual authorization in code is explicit and easier to debug
- Consistent pattern across all API routes
- RLS still protects direct database access (Supabase dashboard, etc.)

---

## API Route Patterns

### Standard API Route Structure

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    if (!body.requiredField) {
      return NextResponse.json(
        { message: 'Required field is missing' },
        { status: 400 }
      );
    }

    // 2. Authenticate
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3. Use admin client for DB operations
    const adminClient = createAdminClient();

    // 4. Fetch and verify ownership
    const { data, error } = await adminClient
      .from('table')
      .select('*')
      .eq('id', body.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: 'Not found' },
        { status: 404 }
      );
    }

    // 5. Authorization check
    if (data.user_email !== user.email) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    // 6. Perform operation
    const { error: updateError } = await adminClient
      .from('table')
      .update({ ... })
      .eq('id', body.id);

    if (updateError) {
      console.error('Error:', updateError);
      return NextResponse.json(
        { message: 'Operation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Success' });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Common Issues & Solutions

### Issue: Password Reset Returns 500 "Failed to update password"

**File:** `src/app/api/auth/reset-password/route.ts`

**Cause:** Trying to update a `password` column that doesn't exist. Passwords are in Supabase Auth, not in database tables.

**Solution:** Use `supabase.auth.admin.updateUserById()`:
```typescript
const supabase = createAdminClient();

// Get user's auth_user_id from landlords/vendors table
const { data: userData } = await supabase
  .from('landlords')
  .select('auth_user_id')
  .eq('email', email)
  .single();

// Update password in Supabase Auth
await supabase.auth.admin.updateUserById(
  userData.auth_user_id,
  { password: newPassword }
);
```

**Fixed in:** 2026-01-01

---

### Issue: Review Submission Returns 404 "Match not found"

**File:** `src/app/api/landlord/reviews/route.ts`

**Cause:** Using `createClient()` which applies RLS. Landlords didn't have SELECT/UPDATE policies on `request_vendor_matches` table.

**Solution:** Use `createAdminClient()` for database operations:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser(); // Auth only

const adminClient = createAdminClient();
const { data: match } = await adminClient  // Use admin for queries
  .from('request_vendor_matches')
  .select('*, request:service_requests(landlord_email)')
  .eq('id', match_id)
  .single();
```

**Fixed in:** 2026-01-01

---

### Issue: Landlord Can't See Their Requests

**File:** `src/app/api/landlord/requests/route.ts`

**Cause:** RLS policy only checked `landlord_id`, but requests submitted before signup have `landlord_id = NULL`.

**Solution:** RLS policy should check both `landlord_id` AND `landlord_email`:
```sql
CREATE POLICY "Landlords can view own requests" ON service_requests
  FOR SELECT USING (
    landlord_id IN (SELECT id FROM landlords WHERE auth_user_id = auth.uid())
    OR
    landlord_email = (auth.jwt() ->> 'email')
  );
```

**Migration:** `007_fix_landlord_request_visibility.sql`

---

## Service Request Data Model

### Key Fields

The `service_requests` table stores request data with these important fields:

| Field | Type | Description |
|-------|------|-------------|
| `service_type` | `ServiceCategory` | Main service category (e.g., `plumber_sewer`, `electrician`) |
| `service_details` | `JSONB` | Sub-categories and classification options selected in the form |
| `job_description` | `TEXT` | Free-text description of the work needed |
| `finish_level` | `VARCHAR` | For GC/renovation jobs: `premium`, `standard`, `budget` |
| `property_type` | `VARCHAR` | Type of property (row home, single family, etc.) |
| `urgency` | `UrgencyLevel` | `low`, `medium`, `high`, `emergency` |

### Service Details (Sub-categories)

The `service_details` JSONB field stores dynamic form fields based on the selected service type. Each service category in `SERVICE_TAXONOMY` (defined in `src/types/database.ts`) has `classifications` that define the sub-options.

Example for a plumber request:
```json
{
  "Service Needed": "Leak",
  "Fixture Involved": "Kitchen Sink"
}
```

### Displaying Service Details

When showing request details, always check for and display `service_details`:

```tsx
{request.service_details && Object.keys(request.service_details).length > 0 && (
  <>
    <Divider>Service Details</Divider>
    <Descriptions column={1} bordered size="small">
      {Object.entries(request.service_details).map(([key, value]) => (
        <Descriptions.Item key={key} label={key}>
          {value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  </>
)}
```

**Files displaying request details:**
- `src/app/dashboard/page.tsx` - Landlord dashboard (modal)
- `src/app/(admin)/requests/page.tsx` - Admin requests page (drawer)

---

## Checklist for New API Routes

Before deploying a new API route, verify:

- [ ] Using `createAdminClient()` for database operations (not `createClient()`)
- [ ] Authentication check at the start (`supabase.auth.getUser()`)
- [ ] Manual authorization check (verify user owns the resource)
- [ ] Proper error handling with appropriate status codes
- [ ] Input validation before database operations
- [ ] Console logging for errors (helps debugging)

## Checklist for New Database Tables

When adding a new table:

- [ ] Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
- [ ] Add admin full access policy
- [ ] Document the table in this file's Policy Summary
- [ ] If API routes will access it, plan to use `createAdminClient()`

---

## Smart Matching System

The Smart Matching Assistant helps admins match vendors to requests using an intelligent scoring algorithm.

### Architecture

```
src/lib/matching/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript interfaces
├── config.ts                # Scoring weights and thresholds
├── calculateMatchScore.ts   # Main scoring function
└── factors/
    ├── serviceMatch.ts      # Service type matching (25%)
    ├── locationMatch.ts     # Zip code matching (20%)
    ├── performanceScore.ts  # Vendor quality (15%)
    ├── responseTime.ts      # Response speed (10%)
    ├── availability.ts      # Urgency/emergency (10%)
    ├── specialtyMatch.ts    # Equipment types (10%)
    ├── capacity.ts          # Current workload (5%)
    └── priceFit.ts          # Budget matching (5%)
```

### API Endpoint

**GET /api/requests/[id]/suggestions**

Returns ranked vendor suggestions with match scores.

Response:
```typescript
{
  request: { id, service_type, zip_code, urgency },
  suggestions: VendorWithMatchScore[],  // Recommended vendors
  otherVendors: VendorWithMatchScore[], // All other active vendors
  meta: {
    totalEligible: number,
    totalRecommended: number,
    averageScore: number,
    scoringVersion: string
  }
}
```

### Match Score Calculation

Each vendor gets a score (0-100) based on 8 factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Service Match | 25% | Does vendor offer the exact service? |
| Location Match | 20% | Is vendor's service area compatible? |
| Performance | 15% | Vendor's overall quality rating |
| Response Time | 10% | Historical response speed |
| Availability | 10% | Emergency/urgency capability |
| Specialty | 10% | Equipment/sub-category match |
| Capacity | 5% | Current workload (pending jobs) |
| Price Fit | 5% | Budget range compatibility |

### Thresholds

- **Recommended**: Score >= 65
- **High Confidence**: Score >= 75 with good data coverage
- **Max Recommendations**: 3 vendors

### UI Components

```
src/components/admin/matching/
├── MatchScoreBadge.tsx       # Circular score indicator
├── ConfidenceIndicator.tsx   # High/medium/low confidence tag
├── MatchFactorsList.tsx      # Detailed factor breakdown
└── VendorSuggestionCard.tsx  # Recommendation card with details
```

### Using the Matching System

```typescript
import {
  calculateMatchScores,
  createMatchingContext,
  enrichVendorWithMatchData,
} from '@/lib/matching';

// 1. Create context from request
const context = createMatchingContext(serviceRequest);

// 2. Enrich vendors with metrics
const enrichedVendors = vendors.map(v =>
  enrichVendorWithMatchData(v, {
    pendingJobsCount: counts[v.id] || 0,
    avgResponseTimeHours: times[v.id] || null,
  })
);

// 3. Calculate scores
const scoredVendors = calculateMatchScores(enrichedVendors, context);

// 4. Get suggestions (recommended = true)
const suggestions = scoredVendors.filter(v => v.matchScore.recommended);
```

### Configuration

Adjust scoring weights in `src/lib/matching/config.ts`:

```typescript
export const MATCH_SCORING_WEIGHTS = {
  serviceMatch: 0.25,
  locationMatch: 0.20,
  performanceScore: 0.15,
  // ... etc
};

export const MATCH_SCORING_THRESHOLDS = {
  recommendedThreshold: 65,
  maxRecommendations: 3,
};
```

---

## CRM & Payment Tracking

### Overview

The CRM system tracks the complete job lifecycle from intro to payment:

```
Request → Match → Intro Sent → Vendor Accepts → Job Won → Job Completed → Payment → Review
```

### Database Schema

#### New Table: `referral_payments`

Tracks vendor referral payments:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `match_id` | UUID | Link to request_vendor_matches |
| `vendor_id` | UUID | Link to vendors |
| `request_id` | UUID | Link to service_requests |
| `amount` | DECIMAL | Payment amount |
| `fee_type` | VARCHAR | 'fixed' or 'percentage' |
| `status` | payment_status | pending, invoiced, paid, overdue, waived, refunded |
| `invoice_date` | TIMESTAMP | When invoice was created |
| `due_date` | TIMESTAMP | Payment due date |
| `paid_date` | TIMESTAMP | When payment was received |
| `payment_method` | VARCHAR | check, ach, venmo, etc. |
| `payment_reference` | VARCHAR | Transaction ID / check number |

#### Enhanced `request_vendor_matches` Fields

| Column | Type | Description |
|--------|------|-------------|
| `job_won` | BOOLEAN | Did vendor get this job? |
| `job_won_at` | TIMESTAMP | When job was marked as won |
| `job_completed_at` | TIMESTAMP | When job was completed |
| `job_outcome_reason` | VARCHAR | Why job was won/lost |
| `outcome_notes` | TEXT | Additional notes |
| `review_requested_at` | TIMESTAMP | When review was requested |

#### Vendor Fee Configuration

| Column | Type | Description |
|--------|------|-------------|
| `default_fee_type` | VARCHAR | 'fixed' or 'percentage' |
| `default_fee_amount` | DECIMAL | Default fixed fee amount |
| `default_fee_percentage` | DECIMAL | Default percentage (0-100) |

### Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| CRM Dashboard | `/admin/crm` | Job lifecycle tracking, pipeline view |
| Payments | `/admin/payments` | Payment management, recording |
| Analytics (Conversions tab) | `/admin/analytics` | Conversion rates by service type & vendor |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/crm/pipeline` | GET | Pipeline stage counts |
| `/api/admin/crm/jobs` | GET | Jobs with lifecycle data |
| `/api/admin/crm/conversions` | GET | Conversion analytics |
| `/api/admin/payments` | GET/POST | List/create payments |
| `/api/admin/payments/[id]` | GET/PATCH/DELETE | Single payment operations |
| `/api/admin/matches/[id]` | GET/PATCH | Job outcome updates |

### Job Lifecycle Workflow

1. **Intro Sent**: Vendor receives intro email
2. **Vendor Accepts/Declines**: Vendor responds
3. **Job Won/Lost**: Admin marks outcome (with reason if lost)
4. **Job Completed**: Admin marks completion, creates payment record
5. **Payment**: Admin records payment when received
6. **Review**: Review collected from landlord

### Usage Examples

**Mark Job as Won:**
```typescript
await fetch(`/api/admin/matches/${matchId}`, {
  method: 'PATCH',
  body: JSON.stringify({ job_won: true }),
});
```

**Mark Job as Complete with Payment:**
```typescript
await fetch(`/api/admin/matches/${matchId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    job_completed: true,
    create_payment: true,
    payment_amount: 150,
    job_cost: 2500, // What landlord paid vendor
  }),
});
```

**Record Payment:**
```typescript
await fetch('/api/admin/payments', {
  method: 'POST',
  body: JSON.stringify({
    match_id: matchId,
    amount: 150,
    fee_type: 'fixed',
    status: 'pending',
  }),
});
```
