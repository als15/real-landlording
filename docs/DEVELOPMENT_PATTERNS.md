# Development Patterns & Solutions

This document captures recurring patterns, common issues, and their solutions to avoid repeating mistakes.

---

## Table of Contents

1. [Supabase Authentication & Authorization](#supabase-authentication--authorization)
2. [Row Level Security (RLS) Patterns](#row-level-security-rls-patterns)
3. [API Route Patterns](#api-route-patterns)
4. [Common Issues & Solutions](#common-issues--solutions)

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
