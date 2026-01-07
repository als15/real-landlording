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
| `ADMIN_EMAIL` | Admin notification email address | `admin@reallandlording.com` |

### DocuSign Integration (SLA Signing)

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `DOCUSIGN_INTEGRATION_KEY` | DocuSign application client ID | Create app at [developers.docusign.com](https://developers.docusign.com) |
| `DOCUSIGN_USER_ID` | DocuSign user ID (GUID) | Found in DocuSign admin under Users |
| `DOCUSIGN_ACCOUNT_ID` | DocuSign account ID | Found in DocuSign admin settings |
| `DOCUSIGN_RSA_PRIVATE_KEY` | Base64-encoded RSA private key | Generate keypair in DocuSign app settings |
| `DOCUSIGN_SLA_TEMPLATE_ID` | Template ID for SLA document | Create template in DocuSign, copy ID |
| `DOCUSIGN_BASE_PATH` | DocuSign API base URL | `https://demo.docusign.net/restapi` (sandbox) or `https://na4.docusign.net/restapi` (production) |
| `DOCUSIGN_OAUTH_BASE_PATH` | DocuSign OAuth URL | `account-d.docusign.com` (sandbox) or `account.docusign.com` (production) |
| `DOCUSIGN_WEBHOOK_SECRET` | Webhook HMAC secret (optional) | Generate in DocuSign Connect settings |

**DocuSign Setup Steps:**

1. Create developer account at [developers.docusign.com](https://developers.docusign.com)
2. Create a new application (Integration)
3. Enable JWT Grant authentication
4. Generate RSA keypair in app settings
5. Grant consent by visiting the consent URL (see DocuSign docs)
6. Create SLA template with these placeholder fields:
   - `vendor_name` (text)
   - `business_name` (text)
   - `signature` (signature field)
   - `date_signed` (date field)
7. Create a Connect webhook configuration pointing to `/api/webhooks/docusign`
8. Add all environment variables to your `.env` file

**Webhook URL:** `https://your-domain.com/api/webhooks/docusign`

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
| 2026-01-07 | Added DocuSign integration for vendor SLA signing | lib/docusign/*, api routes, vendors page |
| 2026-01-06 | Vendor apply form terms link now points to internal `/terms/vendor` page | vendor/apply/page.tsx |
| 2026-01-06 | Request form terms link now points to internal `/terms/user` page with updated content | MultiStepServiceRequestForm.tsx, terms/user/page.tsx |
| 2026-01-01 | Changed terms/privacy links to `reallandlording.com/terms-and-disclosure-for-prolink-service/` | PublicFooter.tsx, MultiStepServiceRequestForm.tsx, vendor/apply/page.tsx |
