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

### Twilio SMS Integration

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | [console.twilio.com](https://console.twilio.com) - Dashboard |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | [console.twilio.com](https://console.twilio.com) - Dashboard |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number (E.164 format) | Purchase in Twilio Console → Phone Numbers |

**SMS is automatically sent alongside emails when Twilio credentials are configured.**

**Twilio Setup Steps:**

1. Create account at [twilio.com](https://www.twilio.com)
2. Copy Account SID and Auth Token from the dashboard
3. Purchase a phone number with SMS capability
4. Add environment variables to your `.env` file:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

**SMS Trigger Points:**
- Request submitted → Landlord receives confirmation SMS
- Vendors matched → Landlord and vendors receive intro SMS
- Follow-up (3-5 days) → Landlord receives follow-up SMS
- Vendor approved → Vendor receives welcome SMS
- Vendor rejected → Vendor receives rejection SMS
- Vendor application submitted → Vendor receives confirmation SMS

### PandaDoc Integration (SLA Signing)

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `PANDADOC_API_KEY` | PandaDoc API key | [app.pandadoc.com/a/#/settings/integrations/api](https://app.pandadoc.com/a/#/settings/integrations/api) |
| `PANDADOC_SLA_TEMPLATE_ID` | Template UUID for SLA document | Create template in PandaDoc, copy UUID from URL |
| `PANDADOC_WEBHOOK_SECRET` | Webhook shared secret (optional) | Set in PandaDoc webhook configuration |

**PandaDoc Setup Steps:**

1. Create account at [pandadoc.com](https://www.pandadoc.com)
2. Go to Settings → Integrations → API and create an API key
3. Create SLA template with these token placeholders (use {{token_name}} format):
   - `vendor_name` - Vendor's contact name
   - `business_name` - Vendor's business name
   - `commission_rate` - Commission percentage (optional, for future use)
4. Add signature field assigned to "Vendor" role
5. Add date field for signature date
6. Copy template UUID from the URL (the ID after `/templates/`)
7. Configure webhook at Settings → Integrations → Webhooks:
   - URL: `https://your-domain.com/api/webhooks/pandadoc`
   - Events: `document_state_changed`, `document_completed_pdf_ready`
   - Add shared secret for verification (optional but recommended)
8. Add environment variables to your `.env` file

**Webhook URL:** `https://your-domain.com/api/webhooks/pandadoc`

**PandaDoc vs DocuSign:**
- Simpler API key authentication (no JWT/RSA complexity)
- Lower pricing (~$19-35/mo vs ~$40-50/mo)
- Two-step document flow: create → send (vs single envelope create)

---

## Email Configuration

Located in `src/lib/email/resend.ts`

- Email provider: **Resend**
- From email configured in the resend lib file

---

## SMS Configuration

Located in `src/lib/sms/twilio.ts`

- SMS provider: **Twilio**
- Templates in `src/lib/sms/templates.ts`
- Send functions in `src/lib/sms/send.ts`

**SMS messages are sent in parallel with emails and gracefully fail without blocking the main operation.**

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
| 2026-01-27 | Added Twilio SMS notifications alongside email at all trigger points | lib/sms/*, api/requests, api/requests/[id]/match, api/cron/follow-up, api/admin/applications/[id]/approve, api/admin/applications/[id]/reject, api/vendor/apply |
| 2026-01-21 | Migrated from DocuSign to PandaDoc for SLA signing (simpler API, lower cost) | lib/pandadoc/*, api/webhooks/pandadoc, approve route, send-sla route, resend-sla route |
| 2026-01-07 | Added DocuSign integration for vendor SLA signing | lib/docusign/*, api routes, vendors page |
| 2026-01-06 | Vendor apply form terms link now points to internal `/terms/vendor` page | vendor/apply/page.tsx |
| 2026-01-06 | Request form terms link now points to internal `/terms/user` page with updated content | MultiStepServiceRequestForm.tsx, terms/user/page.tsx |
| 2026-01-01 | Changed terms/privacy links to `reallandlording.com/terms-and-disclosure-for-prolink-service/` | PublicFooter.tsx, MultiStepServiceRequestForm.tsx, vendor/apply/page.tsx |
