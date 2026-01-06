# Configuration & External Links

This document tracks all external URLs, configuration values, and integrations used in the platform.

---

## External URLs

### Terms & Legal

| Purpose | URL | Used In |
|---------|-----|---------|
| Landlord Terms of Service & Privacy | `/terms/user` (internal) | Request Form |
| Vendor Terms of Service & Privacy | `/terms/vendor` (internal) | Vendor Application |
| Legacy Terms (WordPress) | `https://reallandlording.com/terms-and-disclosure-for-prolink-service/` | Footer |

**Files using terms/privacy links:**
- `src/components/layout/PublicFooter.tsx` - Footer links (external WordPress URL)
- `src/components/forms/MultiStepServiceRequestForm.tsx` - Landlord terms checkbox (`/terms/user`)
- `src/app/vendor/apply/page.tsx` - Vendor terms checkbox (`/terms/vendor`)

### WordPress Integration

| Purpose | URL |
|---------|-----|
| Main WordPress site | `https://reallandlording.com` |
| Articles/Blog | `https://reallandlording.com/articles` |

---

## Environment Variables

### Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | `eyJ...` |
| `RESEND_API_KEY` | Resend email service API key | `re_...` |

### Optional

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL for emails/redirects | `http://localhost:3000` |
| `FROM_EMAIL` | Email sender address | Set in `src/lib/email/resend.ts` |

---

## Email Configuration

Located in `src/lib/email/resend.ts`

- Email provider: **Resend**
- From email configured in the resend lib file

---

## Internal Routes (App Pages)

### Public Routes
- `/` - Home page
- `/request` - Service request form
- `/vendor/apply` - Vendor application form
- `/auth/login` - Landlord login
- `/auth/signup` - Landlord signup
- `/auth/forgot-password` - Password reset request
- `/auth/reset-password` - Password reset form (with token)

### Protected Routes - Landlord
- `/dashboard` - Landlord dashboard

### Protected Routes - Vendor
- `/vendor/login` - Vendor login
- `/vendor/dashboard` - Vendor dashboard

### Protected Routes - Admin
- `/admin` - Admin dashboard
- `/admin/requests` - Request management
- `/admin/vendors` - Vendor management
- `/admin/applications` - Vendor applications
- `/admin/landlords` - Landlord directory

---

## Changelog

| Date | Change | Files Affected |
|------|--------|----------------|
| 2026-01-06 | Vendor apply form terms link now points to internal `/terms/vendor` page | vendor/apply/page.tsx |
| 2026-01-06 | Request form terms link now points to internal `/terms/user` page with updated content | MultiStepServiceRequestForm.tsx, terms/user/page.tsx |
| 2026-01-01 | Changed terms/privacy links to `reallandlording.com/terms-and-disclosure-for-prolink-service/` | PublicFooter.tsx, MultiStepServiceRequestForm.tsx, vendor/apply/page.tsx |
