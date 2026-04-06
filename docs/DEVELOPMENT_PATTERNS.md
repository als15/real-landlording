# Development Patterns & Solutions

This document captures recurring patterns, common issues, and their solutions to avoid repeating mistakes.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Git Branching Workflow](#git-branching-workflow)
3. [Supabase Authentication & Authorization](#supabase-authentication--authorization)
4. [Row Level Security (RLS) Patterns](#row-level-security-rls-patterns)
5. [API Route Patterns](#api-route-patterns)
6. [Security Patterns](#security-patterns)
7. [Service Taxonomy (DB-Driven)](#service-taxonomy-db-driven)
8. [Vendor Referral Terms](#vendor-referral-terms)
9. [Request Status Lifecycle](#request-status-lifecycle)
10. [Follow-Up Messaging System](#follow-up-messaging-system)
11. [Landlord Dashboard](#landlord-dashboard)
12. [Vendor Dashboard](#vendor-dashboard)
13. [Common Issues & Solutions](#common-issues--solutions)

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
| `SMS_ENABLED` | Set to `true` to enable Telnyx SMS (also requires `TELNYX_API_KEY` + `TELNYX_PHONE_NUMBER`) |

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
| `landlord_saved_vendors` | Landlord (own) | ✅ | ✅ | ✅ | ✅ |
| `landlord_saved_vendors` | Service role | ✅ | ✅ | ✅ | ✅ |

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

## CRM / Referral Lifecycle

### Data Model

The CRM tracks referral jobs via `request_vendor_matches` joined with `referral_payments`. Key fields:

| Field | Table | Description |
|-------|-------|-------------|
| `status` | `request_vendor_matches` | Match lifecycle stage (enum `match_status`) |
| `job_won` / `job_completed` | `request_vendor_matches` | Boolean outcome flags |
| `expected_due_date` | `request_vendor_matches` | Admin-set deadline for follow-up |
| `admin_notes` | `request_vendor_matches` | Internal notes per match |
| `referral_payments.*` | `referral_payments` | Payment tracking per match |

### Match Status Enum

The `match_status` enum includes: `pending`, `intro_sent`, `estimate_sent`, `vendor_accepted`, `vendor_declined`, `no_response`, `in_progress`, `completed`, `cancelled`, `no_show`.

### CRM API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/crm/pipeline` | GET | Pipeline stage counts |
| `/api/admin/crm/jobs` | GET | Paginated jobs with filters |
| `/api/admin/crm/jobs/export` | GET | All filtered jobs (no pagination, for CSV export) |
| `/api/admin/matches/[id]` | PATCH | Update match fields (status, expected_due_date, admin_notes, job outcome, etc.) |

### Operational Filter Presets

The jobs API supports these `stage` query param values:

- **Pipeline stages:** `intro_sent`, `awaiting_outcome`, `job_won`, `in_progress`, `completed`, `needs_review`, `lost`
- **Operational presets:**
  - `needs_followup` — status IN (intro_sent, estimate_sent, vendor_accepted) AND job_won IS NULL
  - `commission_pending` — job_won = true, then post-filtered to exclude completed jobs without outstanding payments
  - `overdue` — expected_due_date < NOW() AND status not in terminal states
  - `closed` — status IN (completed, vendor_declined, no_response, no_show, cancelled)

### CSV Export

The CRM page exports via `/api/admin/crm/jobs/export` (returns all matching jobs without pagination). CSV formatting happens client-side using `src/lib/utils/csv-export.ts` (`objectsToCsv` + `downloadCsv`).

---

## Service Taxonomy (DB-Driven)

Service categories and groups are stored in the database (`service_category_groups` and `service_categories` tables) and managed via the admin UI at `/service-categories`.

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/serviceTaxonomy.ts` | Server-side cached data loading |
| `src/hooks/useServiceTaxonomy.ts` | Client-side React hook |
| `src/app/api/service-categories/route.ts` | Public API endpoint |
| `src/app/api/admin/service-categories/route.ts` | Admin CRUD API |
| `src/app/(admin)/service-categories/page.tsx` | Admin management UI |
| `src/lib/serviceSearchIndex.ts` | Search index for service selection |

### Client Components

Use the `useServiceTaxonomy()` hook:

```typescript
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';

function MyComponent() {
  const { labels, taxonomyMap, groupLabels, loading } = useServiceTaxonomy();
  // labels: Record<string, string> — key → display label
  // taxonomyMap: Record<string, ServiceCategoryConfig> — same shape as old SERVICE_TAXONOMY
  // groupLabels: Record<string, string> — group key → group label
}
```

### Server-Side Code (API Routes, Templates)

Use async functions from `src/lib/serviceTaxonomy.ts`:

```typescript
import { getServiceTypeLabels, getServiceTaxonomyMap } from '@/lib/serviceTaxonomy';

const labels = await getServiceTypeLabels();
const taxonomy = await getServiceTaxonomyMap();
```

Data is cached in-memory for 30 seconds. Call `invalidateServiceTaxonomyCache()` after admin writes.

### Caching Strategy

Three cache layers ensure fast reads while keeping data reasonably fresh after admin edits:

| Layer | TTL | Details |
|-------|-----|---------|
| CDN (`s-maxage`) | 60s | Vercel edge cache; `stale-while-revalidate=60` for background refresh |
| Browser (`max-age`) | 0 | Browser always revalidates; client fetch uses `cache: 'no-store'` |
| Server in-memory | 30s | Per-instance cache; cleared by `invalidateServiceTaxonomyCache()` |

The client hook also refreshes automatically when the browser tab becomes visible (`visibilitychange` event), so switching from the admin tab to a form tab triggers a fresh fetch.

### Database Schema

- `service_category_groups`: `id`, `key` (unique), `label`, `sort_order`, `is_active`
- `service_categories`: `id`, `key` (unique), `label`, `group_key` (FK), `sort_order`, `is_active`, `classifications` (JSONB), `emergency_enabled`, `finish_level_enabled`, `external_link`, `external_url`, `search_keywords` (JSONB)
- RLS: public SELECT, writes via `createAdminClient()` (service role)

### Deprecated Exports (database.ts)

The following exports in `src/types/database.ts` are deprecated and will be removed in a future cleanup:

- `SERVICE_TAXONOMY` → use `useServiceTaxonomy().taxonomyMap` or `getServiceTaxonomyMap()`
- `SERVICE_TYPE_LABELS` → use `useServiceTaxonomy().labels` or `getServiceTypeLabels()`
- `SERVICE_CATEGORY_GROUP_LABELS` → use `useServiceTaxonomy().groupLabels` or `getGroupLabels()`
- `getServiceCategoryOptions()` → use hook data
- `getServiceCategoriesByGroup()` → use hook data
- `getGroupedServiceCategories()` → use hook data

Server-side files (email templates, SMS templates, notification service, matching logic) still import from `database.ts` during transition.

---

## Vendor Referral Terms

**Migration:** `022_vendor_referral_terms.sql` — 15 `referral_*` columns on the `vendors` table.

### Column Reference

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `referral_fee_type` | VARCHAR(30) | `'percentage'` | `percentage`, `flat_fee`, `percentage_plus_flat` |
| `referral_fee_percentage` | DECIMAL(5,2) | `5.00` | Fee percentage (0–100) |
| `referral_fee_flat_amount` | DECIMAL(10,2) | NULL | Flat fee dollar amount |
| `referral_calculation_basis` | VARCHAR(30) | `'gross_invoice'` | `gross_invoice`, `net_invoice`, `per_referral`, `matched_only` |
| `referral_fee_trigger` | VARCHAR(30) | `'upon_vendor_paid'` | `upon_vendor_paid`, `upon_match`, `upon_invoice_issued`, `custom` |
| `referral_payment_due_days` | INTEGER | `7` | Days after trigger |
| `referral_late_fee_enabled` | BOOLEAN | `true` | Toggle late fees |
| `referral_late_fee_rate_type` | VARCHAR(30) | `'percentage_per_month'` | `percentage_per_month`, `flat_amount`, `none` |
| `referral_late_fee_rate_value` | DECIMAL(10,2) | `1.50` | Rate value |
| `referral_late_fee_grace_period_days` | INTEGER | `0` | Grace period days |
| `referral_repeat_fee_modifier` | DECIMAL(5,2) | `50.00` | % of original fee for repeats |
| `referral_repeat_fee_window_months` | INTEGER | `24` | Window for repeat classification |
| `referral_terms_effective_date` | DATE | `CURRENT_DATE` | When terms take effect |
| `referral_terms_version` | VARCHAR(20) | `'v1.0'` | Version label |
| `referral_custom_terms_notes` | TEXT | NULL | Required when trigger = custom |

### Relationship to Legacy `default_fee_*` Columns

The legacy `default_fee_type`, `default_fee_amount`, and `default_fee_percentage` columns (migration 013) are used by the CRM for individual match/payment tracking. They remain untouched. The new `referral_*` columns define the **per-vendor referral agreement terms** and are managed via the **Referral Terms tab** on the vendor detail page (`/vendors/[id]`).

### Conditional UI Logic

- **Fee Type → value fields**: `percentage` shows only %, `flat_fee` shows only $, `percentage_plus_flat` shows both. On save, irrelevant fields are nulled/zeroed.
- **Late Fee toggle**: When `referral_late_fee_enabled` is false, the rate type/value/grace fields are hidden and saved as `none`/`0`/`0`.
- **Fee Trigger = custom**: Makes `referral_custom_terms_notes` required. When trigger is not custom, notes are optional.

### TypeScript

- `Vendor` interface: 15 fields after the legacy `default_fee_*` section
- `VendorInput` interface: 15 optional fields
- Label maps: `REFERRAL_FEE_TYPE_LABELS`, `REFERRAL_CALCULATION_BASIS_LABELS`, `REFERRAL_FEE_TRIGGER_LABELS`, `REFERRAL_LATE_FEE_RATE_TYPE_LABELS` in `src/types/database.ts`

### Vendor Detail Page Architecture

The vendor detail/edit UI lives on a dedicated page at `/vendors/[id]` with tabbed sections. The vendor list page (`/vendors`) only shows the table — clicking a row navigates to the detail page.

**Components** (in `src/components/admin/vendors/`):
- `constants.ts` — shared color maps (`statusColors`, `slaStatusColors`, `matchStatusColors`, `matchStatusLabels`)
- `VendorOverviewTab` — status, contact info, qualifications, vetting score, performance
- `VendorServicesTab` — services, specialties, service areas (uses `useServiceTaxonomy()`)
- `VendorReferralTermsTab` — all 15 referral fields with conditional logic
- `VendorSlaComplianceTab` — SLA status/actions, admin notes
- `VendorHistoryTab` — read-only referral match card list

Each editable tab follows the pattern: view-first with `<Descriptions>`, "Edit" button toggles an inline `<Form>`, `onUpdate(partialData)` calls the parent's PATCH handler.

---

## Request Status Lifecycle

**Migration:** `023_add_failed_request_status.sql`

| Status | Meaning |
|--------|---------|
| `new` | Request submitted, awaiting admin review |
| `matching` | Admin is finding vendors |
| `matched` | Vendors assigned, intro sent |
| `completed` | Job finished successfully |
| `cancelled` | Landlord withdrew the request |
| `failed` | Match attempted but unsuccessful (vendor unresponsive, job fell through, etc.) |

### `failed` vs `cancelled`
- **`cancelled`** — landlord-initiated withdrawal before or during matching
- **`failed`** — match was attempted but didn't work out (vendor didn't respond, job fell through, price disagreement, etc.)

### UI behavior for `failed`
- Color: `volcano` (orange-red) across all status tags
- Match Vendors button is disabled (same as `matched`/`completed`)
- Matched vendors section still displays for reference
- Analytics: excluded from success metrics (same as `cancelled`)

---

## OpenAI Client Pattern

### Architecture

The OpenAI integration uses raw `fetch` (no npm package), following the same pattern as PandaDoc (`src/lib/pandadoc/client.ts`).

| File | Purpose |
|------|---------|
| `src/lib/openai/client.ts` | Thin fetch wrapper for OpenAI Responses API |
| `src/lib/openai/due-diligence.ts` | Vendor analysis logic, prompt, JSON schema |
| `src/lib/openai/index.ts` | Barrel exports |
| `src/lib/serper/client.ts` | Serper.dev Google Search API client |
| `src/lib/serper/search.ts` | 8 parallel search orchestrator |
| `src/lib/serper/index.ts` | Barrel exports |

### Hybrid Due Diligence (Serper + OpenAI)

Due diligence uses a hybrid approach for speed and reliability:

```
SERPER_API_KEY present → Serper (8 parallel searches) → OpenAI (text analysis, no tools)
SERPER_API_KEY absent  → OpenAI (web_search_preview fallback)
```

Both paths return the same `DueDiligenceResults` type — the API route and frontend are unaware of which path runs.

**Why hybrid?** OpenAI's `web_search_preview` returns empty results for businesses with many Google reviews (200+). Serper gives us raw search data we control, and parallel execution is ~4x faster (7-17s vs 40-80s).

The Serper search orchestrator (`gatherVendorSearchData`) runs 8 `Promise.allSettled` searches:
1. Google Places (rating, review count)
2. Yelp (`site:yelp.com`)
3. BBB (`site:bbb.org`)
4. Facebook (`site:facebook.com`)
5. Angi/HomeAdvisor (`site:angi.com OR site:homeadvisor.com`)
6. General reviews
7. Legal/complaints
8. Community (Reddit/Nextdoor)

### Usage

```typescript
import { isOpenAIConfigured, runDueDiligenceAnalysis } from '@/lib/openai';

// Check configuration before calling
if (!isOpenAIConfigured()) {
  return NextResponse.json({ message: 'OpenAI not configured' }, { status: 503 });
}

// Run analysis (returns structured result)
const result = await runDueDiligenceAnalysis(vendor);
if (result.success) {
  // result.results: DueDiligenceResults (structured JSON)
  // result.rawResponse, result.model, result.tokensUsed
}
```

### Vendor Application Flow

The vendor application review process includes these admin-triggered actions:

1. **Due Diligence** — AI-powered background research (`/api/admin/applications/[id]/due-diligence`)
2. **Schedule Interview** — Send Calendly link via email + SMS (`/api/admin/applications/[id]/schedule-interview`)
3. **Approve** — Create auth account, send welcome email, send SLA (`/api/admin/applications/[id]/approve`)
4. **Reject** — Send rejection email (`/api/admin/applications/[id]/reject`)

Interview scheduling tracks `interview_scheduled_at` and `interview_scheduled_count` on the vendors table (migration 025). Requires `CALENDLY_URL` env var.

### Long-Running Routes (`maxDuration`)

For API routes that may take longer than the default Vercel timeout (10s), export `maxDuration`:

```typescript
export const maxDuration = 60; // Vercel Pro plan: up to 60 seconds
```

Used in: `src/app/api/admin/applications/[id]/due-diligence/route.ts`

### Database Table: `vendor_due_diligence`

Migration: `024_vendor_due_diligence.sql`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `vendor_id` | UUID | FK → vendors (CASCADE delete) |
| `status` | VARCHAR(20) | pending, running, completed, failed |
| `results` | JSONB | Structured analysis results |
| `raw_response` | TEXT | Full OpenAI response for debugging |
| `model_used` | VARCHAR(50) | e.g., gpt-4.1 |
| `tokens_used` | INTEGER | Total tokens consumed |
| `search_queries_used` | INTEGER | Number of web searches |
| `error_message` | TEXT | Error details if failed |
| `triggered_by` | UUID | FK → admin_users |
| `created_at` | TIMESTAMPTZ | When analysis was requested |
| `completed_at` | TIMESTAMPTZ | When analysis finished |

RLS: Admin-only access (same pattern as other admin tables).

---

## Follow-Up Messaging System

### Overview
Multi-stage follow-up workflow that tracks each vendor-landlord match from intro through completion/payment/feedback. Implemented as a state machine on each match.

### Feature Flag
**Disabled by default.** Set `FOLLOW_UP_SYSTEM_ENABLED=true` in env to activate. When disabled:
- Cron endpoint returns immediately with a "disabled" message
- Response links redirect to the invalid page
- DB trigger still creates `match_followups` rows (so data is ready when enabled)

### Key Files
- `supabase/migrations/026_follow_up_system.sql` — DB tables + trigger
- `src/lib/followup/config.ts` — feature flag
- `src/lib/followup/tokens.ts` — HMAC-SHA256 signed response tokens (30-day expiry)
- `src/lib/followup/handler.ts` — state machine (all stage transitions)
- `src/lib/followup/processor.ts` — cron logic (sends emails/SMS based on stage)
- `src/lib/email/followup-templates.ts` — email templates (5 templates)
- `src/lib/sms/followup-templates.ts` — SMS companion messages
- `src/app/api/follow-up/respond/route.ts` — public token-based response endpoint
- `src/app/api/admin/followups/[matchId]/route.ts` — admin GET/PATCH
- `src/app/api/cron/follow-up-system/route.ts` — cron (every 6 hours)
- `src/components/admin/FollowUpBadge.tsx` — stage badge for CRM

### Database Tables
- `match_followups` — one per match, tracks current stage + next action time
- `followup_events` — audit trail of all transitions, emails, responses

### Stage Flow
```
pending → vendor_check_sent → vendor_booked/vendor_discussing/vendor_cant_reach/vendor_no_deal
vendor_discussing → day7_recheck_sent → booked/closed
vendor_cant_reach → landlord_check_sent → landlord_contact_ok/closed
awaiting_completion → completion_check_sent → job_completed/job_in_progress/job_cancelled
```

### Token System
Response links use HMAC-SHA256 signed tokens: `{followupId}.{type}.{timestamp}.{hmac}`
- Secret: `FOLLOWUP_TOKEN_SECRET` env var
- Expiry: 30 days
- Tokens are stored in `match_followups` and cleared after use (one-time use)

### Environment Variables
```
FOLLOW_UP_SYSTEM_ENABLED=false   # Feature flag (must be 'true' to activate)
FOLLOWUP_TOKEN_SECRET=<32+ chars>  # HMAC signing secret
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
- `src/components/dashboard/RequestDetailDrawer.tsx` - Landlord dashboard (drawer)
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

---

## Security Patterns

### Rate Limiting

Auth-related API routes use in-memory rate limiting (`src/lib/rate-limit.ts`):

```typescript
import { rateLimit } from '@/lib/rate-limit';

const ip = request.headers.get('x-forwarded-for') || 'unknown';
const { allowed } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 min
if (!allowed) {
  return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
}
```

Applied to: login (all 3), signup, forgot-password endpoints.

### HTML Escaping in Email Templates

All user-provided data in email templates must be escaped with `escapeHtml()` from `src/lib/security.ts`:

```typescript
import { escapeHtml } from '@/lib/security';
const e = escapeHtml; // shorthand

// In template:
`<p>Hi ${e(request.landlord_name)},</p>`
```

### Redirect URL Validation

Login pages validate `redirectTo` params with `sanitizeRedirectUrl()` from `src/lib/security.ts`:

```typescript
import { sanitizeRedirectUrl } from '@/lib/security';
const redirectTo = sanitizeRedirectUrl(searchParams.get('redirectTo'));
```

This prevents open redirects by ensuring the URL starts with `/` and doesn't contain `://`.

### Admin Route Authorization

**All admin API routes MUST use `verifyAdmin()`** from `src/lib/api/admin.ts`. Never use `createAdminClient()` directly without authentication:

```typescript
const adminResult = await verifyAdmin();
if (!adminResult.success) return adminResult.response;
const { adminClient } = adminResult.context;
```

### Error Response Safety

Never expose database error details to clients. Keep `console.error()` for server logs, but return generic messages:

```typescript
// BAD: { message: 'Failed', error: error.message }
// GOOD: { message: 'Failed to create request' }
```

### Cron Job Authentication

Cron endpoints require `CRON_SECRET` (not optional):

```typescript
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
```

### Anti-Spam / Bot Protection (Signup)

Located in `src/lib/validation.ts` and applied in `src/app/api/auth/signup/route.ts`.

**Name Validation** — `validateName(name)` rejects gibberish names on signup:
- Too short (<2) or too long (>100)
- No vowels, 5+ consecutive consonants, >70% non-letter chars
- Contains URLs or email addresses

```typescript
import { validateName } from '@/lib/validation';

const result = validateName(name);
if (!result.valid) {
  return NextResponse.json({ message: result.reason }, { status: 400 });
}
```

**Suspicious Name Detection** — `isNameSuspicious(name)` flags accounts in admin UI:
- Null/empty, no vowels, 4+ consecutive consonants, >15 char single-word names
- Used by admin landlord directory to show "BOT?" tags and "Suspect" filter

**Honeypot Field** — Hidden `website` field on signup form (`src/app/auth/signup/page.tsx`):
- Invisible to real users (positioned off-screen), filled by bots
- Server returns fake success if honeypot is filled (doesn't reveal detection)
- Uses `position: absolute; left: -9999px` (not `display:none` — bots detect that)

### Landlord Route Authorization

**All landlord dashboard API routes MUST use `verifyLandlord()`** from `src/lib/api/landlord.ts`. This mirrors the admin pattern:

```typescript
import { verifyLandlord } from '@/lib/api/landlord';

export async function GET() {
  const result = await verifyLandlord();
  if (!result.success) return result.response;
  const { adminClient, userId, userEmail, landlordId } = result.context;
  // ... use adminClient for queries
}
```

`verifyLandlord()` looks up the landlord by `auth_user_id` first, then by `email` (handles pre-signup requests). Returns `{ adminClient, userId, userEmail, landlordId }`.

---

## Landlord Dashboard

### Architecture

The landlord dashboard (`/dashboard`) provides a rich, self-service experience:

| Route | Purpose |
|-------|---------|
| `/dashboard` | Stats cards, status chart, recent requests, quick actions |
| `/dashboard/requests` | Filterable requests table with detail drawer |
| `/dashboard/vendors` | Saved/favorited vendors card grid |
| `/dashboard/profile` | User profile |
| `/dashboard/settings` | Account settings |

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/landlord/dashboard` | GET | Dashboard stats (counts, chart data, recent requests) |
| `/api/landlord/requests` | GET | Requests list with filter params (`status`, `service_type`, `urgency`) + match count |
| `/api/landlord/requests/[id]` | GET | Request detail with matches + follow-up stages |
| `/api/landlord/notifications` | GET/PATCH | List notifications / mark-all-read |
| `/api/landlord/notifications/unread-count` | GET | Unread count for badge |
| `/api/landlord/notifications/[id]` | PATCH | Mark individual notification as read |
| `/api/landlord/saved-vendors` | GET/POST | List saved vendors / save a vendor |
| `/api/landlord/saved-vendors/[id]` | DELETE/PATCH | Remove / update notes |

### Components

| File | Description |
|------|-------------|
| `src/components/dashboard/NotificationBell.tsx` | Bell icon + popover dropdown, polls every 30s |
| `src/components/dashboard/RequestDetailDrawer.tsx` | Side drawer with steps, vendor cards, timeline |
| `src/components/dashboard/ReviewModal.tsx` | Extracted vendor review modal |

### Database: `landlord_saved_vendors`

Migration `028_landlord_saved_vendors.sql`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `landlord_id` | UUID | FK → landlords (CASCADE) |
| `vendor_id` | UUID | FK → vendors (CASCADE) |
| `notes` | TEXT | Landlord's personal notes |
| `source_request_id` | UUID | FK → service_requests (nullable) |
| `created_at` | TIMESTAMPTZ | When saved |

UNIQUE constraint on `(landlord_id, vendor_id)`. RLS enabled with landlord-own + service_role policies.

---

### Admin Landlord Deletion

**Single delete:** `DELETE /api/admin/landlords/[id]`
- Nullifies `landlord_id` on associated `service_requests` (preserves request data)
- Deletes landlord record from `landlords` table
- Deletes Supabase Auth user if landlord had `auth_user_id`

**Bulk delete:** `POST /api/admin/landlords/bulk-delete`
- Accepts `{ ids: string[] }` (max 100 per request)
- Same cleanup logic as single delete, batched
- Returns `{ deletedCount, authUsersDeleted }`

---

## Vendor Dashboard

### Architecture

The vendor dashboard (`/vendor/dashboard`) provides a full-featured vendor portal:

| Route | Purpose |
|-------|---------|
| `/vendor/dashboard` | Stats (6 cards), donut chart, recent jobs, quick actions |
| `/vendor/dashboard/jobs` | Filterable jobs table with detail drawer + lifecycle actions |
| `/vendor/dashboard/profile` | Editable profile with per-section edit toggles |

### Auth Helper: `verifyVendor()`

**File:** `src/lib/api/vendor.ts`

Mirrors `verifyLandlord()` pattern. All vendor API routes use this:

```typescript
const result = await verifyVendor();
if (!result.success) return result.response;
const { adminClient, vendorId, vendorStatus } = result.context;
```

Returns `VendorContext`: `{ adminClient, userId, userEmail, vendorId, vendorStatus }`

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vendor/stats` | GET | Dashboard stats (counts, statusBreakdown, recentJobs) |
| `/api/vendor/jobs` | GET | Jobs list with filter params (`status`, `service_type`, `urgency`) |
| `/api/vendor/jobs/[id]/accept` | POST | Accept a job (guards: only from pending/intro_sent/estimate_sent) |
| `/api/vendor/jobs/[id]/decline` | POST | Decline a job (guards: only from pending/intro_sent/estimate_sent) |
| `/api/vendor/jobs/[id]/status` | PATCH | Update status (`in_progress`, `completed`) with transition guards |
| `/api/vendor/profile` | GET | Full vendor profile |
| `/api/vendor/profile` | PATCH | Update allowlisted fields, auto-recalculates vetting score |
| `/api/vendor/notifications` | GET/PATCH | List notifications / mark-all-read |
| `/api/vendor/notifications/unread-count` | GET | Unread count for badge |
| `/api/vendor/notifications/[id]` | PATCH | Mark individual notification as read |

### Job Lifecycle Status Transitions

```
pending/intro_sent/estimate_sent → vendor_accepted (Accept)
pending/intro_sent/estimate_sent → vendor_declined (Decline)
vendor_accepted → in_progress (Mark In Progress)
vendor_accepted → completed (Mark Complete)
in_progress → completed (Mark Complete)
```

Guards are enforced server-side in the accept, decline, and status routes.

### Components

| File | Description |
|------|-------------|
| `src/components/vendor/JobDetailDrawer.tsx` | Side drawer with Steps, service/property details, lifecycle actions, timeline |
| `src/components/vendor/VendorNotificationBell.tsx` | Bell icon + popover dropdown, polls every 30s |

### Profile Editing

The profile PATCH endpoint uses an allowlist — vendors can only edit:
- **Contact:** `contact_name`, `phone`, `website`, `location`, `call_preferences`
- **Social:** `social_instagram`, `social_facebook`, `social_linkedin`
- **Services:** `services`, `service_specialties`, `service_areas`, `licensed_areas`
- **Qualifications:** `qualifications`, `licensed`, `insured`, `rental_experience`, `license_not_required`, `not_currently_licensed`, `years_in_business`
- **Business:** `employee_count`, `job_size_range`, `accepted_payments`, `service_hours_weekdays`, `service_hours_weekends`, `emergency_services`

Vendors cannot edit: `email`, `business_name`, `status`, `performance_score`, `admin_notes`, SLA fields, referral terms.

If `licensed`, `insured`, or `years_in_business` change, `vetting_score` is auto-recalculated via `calculateVettingScore()` from `src/lib/scoring/vetting.ts`.
