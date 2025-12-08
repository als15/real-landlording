# Authentication Strategy

## Overview

The app uses **Supabase Auth** with cookie-based sessions managed via `@supabase/ssr`. Three user types exist with separate flows:

- **Landlords** - Public users who submit service requests
- **Vendors** - Service providers who receive job leads
- **Admins** - Platform operators who manage matches

---

## 1. Landlords (Public Users)

### Sign Up Flow

**Route**: `/auth/signup` → `POST /api/auth/signup`

1. User submits email, name, password
2. `supabase.auth.signUp()` creates auth user in Supabase
3. User metadata (name) stored in auth user's `data` field
4. Upserts record in `landlords` table with `auth_user_id`
5. If `requestId` provided (from SignupNudge modal), links the service request to the landlord
6. Supabase sends verification email automatically

**Code Reference**: `src/app/api/auth/signup/route.ts`

### Sign In Flow

**Route**: `/auth/login` → `POST /api/auth/login`

1. User submits email, password
2. `supabase.auth.signInWithPassword()` authenticates
3. Session cookie set automatically by Supabase SSR
4. Response includes `isAdmin` flag for redirect logic

**Code Reference**: `src/app/api/auth/login/route.ts`

### Protected Routes

- `/dashboard/*` - Landlord dashboard

**Middleware Logic**:
1. Check if `user` exists (authenticated)
2. Verify user has record in `landlords` table (by `auth_user_id` or `email`)
3. Redirect to `/auth/login` if either check fails

---

## 2. Vendors

### Sign Up Flow

Vendors do not self-register. They apply and get approved:

1. Vendor fills application form at `/vendor/apply`
2. Application stored in `vendor_applications` table
3. Admin reviews application in dashboard
4. If approved → Admin creates vendor record, vendor receives invite email
5. Vendor creates auth account and gets linked to vendor profile

### Sign In Flow

**Route**: `/vendor/login` → `POST /api/auth/login`

- Same Supabase auth flow as landlords
- Middleware verifies email exists in `vendors` table
- Vendor must have `status = 'active'` to access dashboard

### Protected Routes

- `/vendor/dashboard/*` - Vendor portal

**Middleware Logic**:
1. Check if `user` exists (authenticated)
2. Verify user's email exists in `vendors` table
3. Verify vendor `status = 'active'`
4. Redirect to `/vendor/login` with appropriate error if any check fails

---

## 3. Admins

### Sign In Flow

**Route**: `/login` → `POST /api/auth/login`

- Same auth flow as other users
- Login endpoint checks `admin_users` table for `auth_user_id` match
- Returns `isAdmin: true` and `role` if user is admin

### Protected Routes

- `/` - Admin dashboard home
- `/requests` - Service requests queue
- `/vendors` - Vendor management
- `/landlords` - Landlord directory
- `/analytics` - Platform analytics

**Middleware Logic**:
1. Check if `user` exists (authenticated)
2. Verify user has record in `admin_users` table (by `auth_user_id`)
3. Redirect to `/login` with `error=access_denied` if not admin

---

## Session Management

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Supabase SSR | `@supabase/ssr` | Cookie-based session management |
| Middleware | `src/middleware.ts` | Refreshes sessions, protects routes |
| Server Client | `src/lib/supabase/server.ts` | For API routes & Server Components |
| Browser Client | `src/lib/supabase/client.ts` | For Client Components |
| Admin Client | `src/lib/supabase/admin.ts` | Bypasses RLS for admin operations |

### Cookie Flow

1. On successful auth, Supabase stores JWT in HTTP-only cookies
2. Middleware runs on every request and refreshes expired sessions
3. Server/client helpers read cookies to determine auth state
4. Cookies are automatically managed by `@supabase/ssr`

### Session Refresh

The middleware automatically refreshes sessions:

```typescript
// In middleware.ts
const { data: { user } } = await supabase.auth.getUser();
```

This call refreshes the session if the access token is expired but the refresh token is still valid.

---

## Database Schema

### Auth Relationships

```
auth.users (Supabase managed)
│
├── landlords
│   └── auth_user_id → auth.users.id
│
├── vendors
│   └── email → matched by email (no direct FK)
│
└── admin_users
    └── auth_user_id → auth.users.id
```

### Key Tables

**landlords**
- `id` - UUID primary key
- `auth_user_id` - Links to Supabase auth user
- `email` - Contact email
- `name` - Full name

**vendors**
- `id` - UUID primary key
- `email` - Used to match auth user
- `status` - 'active', 'inactive', 'pending_review', 'rejected'

**admin_users**
- `id` - UUID primary key
- `auth_user_id` - Links to Supabase auth user
- `role` - Admin role (e.g., 'super_admin', 'admin')

---

## Password Reset Flow

### Forgot Password

**Route**: `/auth/forgot-password` → `POST /api/auth/forgot-password`

1. User submits email
2. `supabase.auth.resetPasswordForEmail()` sends reset link
3. Link redirects to `/auth/reset-password` with token

### Reset Password

**Route**: `/auth/reset-password` → `POST /api/auth/reset-password`

1. User enters new password
2. `supabase.auth.updateUser({ password })` updates password
3. User redirected to login

---

## Environment Variables

Required for authentication:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- `NEXT_PUBLIC_*` variables are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, used by admin client to bypass RLS

---

## Security Considerations

1. **HTTP-only Cookies** - JWTs stored in HTTP-only cookies, not accessible via JavaScript
2. **Row Level Security (RLS)** - Supabase RLS policies restrict data access
3. **Middleware Protection** - All protected routes verified server-side
4. **Admin Client** - Service role key only used server-side for admin operations
5. **Email Verification** - Supabase handles email verification for new signups
