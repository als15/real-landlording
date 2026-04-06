# Follow-Up Messaging System

## Status: Implemented (Feature-Flagged, Disabled by Default)

The follow-up system automates post-introduction tracking between vendors and landlords. It replaces the old single-email follow-up (`/api/cron/follow-up`) with a multi-stage state machine that tracks each match from intro through job completion and landlord feedback.

**To activate:** Set `FOLLOW_UP_SYSTEM_ENABLED=true` and `FOLLOWUP_TOKEN_SECRET=<random-32+-chars>` in your environment variables.

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Stage Flowchart](#stage-flowchart)
3. [Detailed Stage Reference](#detailed-stage-reference)
4. [Email Templates](#email-templates)
5. [Token System](#token-system)
6. [Cron Job](#cron-job)
7. [Admin Override](#admin-override)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [CRM Integration](#crm-integration)
11. [Feature Flag](#feature-flag)
12. [Environment Variables](#environment-variables)
13. [File Map](#file-map)
14. [Testing](#testing)
15. [Activation Checklist](#activation-checklist)
16. [Troubleshooting](#troubleshooting)

---

## How It Works

When an admin sends an intro email (setting `intro_sent=true` on a `request_vendor_matches` row), a database trigger automatically creates a `match_followups` record in the `pending` stage with `next_action_at` set to 3 days in the future.

A cron job runs every 6 hours, picks up any follow-ups whose `next_action_at` has passed, and takes the appropriate action for the current stage — usually sending an email with response buttons.

Vendors and landlords respond by clicking buttons in those emails. Each button is a link to `/api/follow-up/respond` with a signed token and an action parameter. The response handler validates the token, transitions the follow-up to the next stage, and updates the match record as needed.

Admins can override any stage manually via the admin API, for cases where a vendor or landlord responds by phone or in person.

Every stage transition, email send, response, and admin override is logged to the `followup_events` table for a full audit trail.

---

## Stage Flowchart

```
Day 0: Intro Sent → Landlord Day 0 Expectation Email (Step 0)
  |
  | (3 days)
  v
Day 3: Vendor Check Email (Step 1)
  |
  |-- [Booked] ---------> Timeline Request (Step 1.1) --> Awaiting Completion
  |-- [Discussing] -----> Day 7 Recheck (4 days)
  |-- [Can't Reach] ----> Landlord Contact Check
  |-- [No Deal] ---------> CLOSED (admin notified for rematch)

Timeline Request (Step 1.1):
  |-- [1-2 days] --------> Awaiting Completion (check 9 days out)
  |-- [3-5 days] --------> Awaiting Completion (check 12 days out)
  |-- [1-2 weeks] -------> Awaiting Completion (check 21 days out)
  |-- [Longer] ----------> Awaiting Completion (check 37 days out)

Day 7 Recheck (Step 3):
  |-- [Booked] ---------> Timeline Request (Step 1.1)
  |-- [Not Moving Fwd] -> CLOSED (admin notified for rematch)

Landlord Contact Check (Step 2):
  |-- [Contact OK] -----> Day 7 Recheck (4 days)
  |-- [No Contact] ------> CLOSED (high-priority admin notification)

Completion Check (Step 5):
  |-- [Completed] -------> Invoice Request (Step 5A) --> Feedback Request (Step 6) --> CLOSED
  |-- [In Progress] -----> Timeline Request (Step 5B, same as 1.1) --> loops back
  |-- [Cancelled] -------> Cancellation Reason (Step 5C) --> CLOSED + rematch

Invoice Request (Step 5A):
  |-- [Under $500 / $500-1k / $1-2.5k / $2.5-5k / $5k+] --> Feedback Request

Cancellation Reason (Step 5C):
  |-- [Price / Scope / Other Vendor / Other] --> CLOSED + admin notified

Feedback Request (Step 6):
  |-- [Great / OK / Not Good] --> CLOSED
```

---

## Detailed Stage Reference

| Stage | Description | Who Responds | Next Action Timer | Possible Transitions |
|---|---|---|---|---|
| `pending` | Follow-up created, Day 0 landlord msg pending | System (cron) | Immediate | `intro_sent` |
| `intro_sent` | Day 0 landlord expectation sent, waiting for Day 3 | System (cron) | 3 days | `vendor_check_sent` |
| `vendor_check_sent` | Day 3 email sent to vendor | Vendor | None (waiting) | `timeline_requested`, `vendor_discussing`, `landlord_check_sent`, `closed` |
| `timeline_requested` | Waiting for vendor to provide completion timeline | Vendor | None (waiting) | `awaiting_completion` |
| `vendor_discussing` | Vendor said "still discussing" | System (cron) | 4 days | `day7_recheck_sent` |
| `landlord_check_sent` | Vendor couldn't reach landlord; landlord email sent | Landlord | None (waiting) | `landlord_contact_ok`, `closed` |
| `landlord_contact_ok` | Landlord confirmed vendor contact | System (cron) | 4 days | `day7_recheck_sent` |
| `day7_recheck_sent` | Day 7 recheck email sent to vendor | Vendor | None (waiting) | `timeline_requested`, `closed` |
| `awaiting_completion` | Job booked, waiting for completion + 7 day buffer | System (cron) | Dynamic (vendor estimate + 7 days) | `completion_check_sent` |
| `completion_check_sent` | Completion check email sent to vendor | Vendor | None (waiting) | `invoice_requested`, `timeline_requested`, `cancellation_reason_requested` |
| `invoice_requested` | Vendor invoice collection email sent | Vendor | None (waiting) | `feedback_requested` |
| `cancellation_reason_requested` | Vendor cancellation reason email sent | Vendor | None (waiting) | `closed` |
| `feedback_requested` | Landlord feedback email sent | Landlord | None (waiting) | `closed` |
| `closed` | Terminal state | N/A | None | N/A |
| `needs_rematch` | Terminal state indicating admin should rematch | N/A | None | N/A |

---

## Email Templates

Ten email templates are defined in `src/lib/email/followup-templates.ts`. SMS companions are in `src/lib/sms/followup-templates.ts`.

### 1. Landlord Day 0 Expectation (Step 0)
- **Sent to:** Landlord
- **When:** Immediately after intro sent
- **Subject:** `We matched you with a vendor for your {service} project`
- **Content:** Informational only — no response buttons

### 2. Vendor Day 3 Check (Step 1)
- **Sent to:** Vendor
- **When:** 3 days after intro
- **Subject:** `Quick check: {Service} project with {Landlord}`
- **Buttons:** Booked the Job (green) | Still Discussing (blue) | Can't Reach Client (yellow) | Not Moving Forward (red)

### 3. Vendor Timeline Request (Step 1.1 / 5B)
- **Sent to:** Vendor
- **When:** Immediately after "booked" or "in progress" response
- **Subject:** `Timeline: {Service} project with {Landlord}`
- **Buttons:** 1–2 Days (green) | 3–5 Days (blue) | 1–2 Weeks (purple) | Longer (yellow)

### 4. Vendor Day 7 Recheck (Step 3)
- **Sent to:** Vendor
- **When:** 4 days after "discussing" or "contact OK" response
- **Subject:** `Following up: {Service} project with {Landlord}`
- **Buttons:** Booked the Job (green) | Not Moving Forward (red)

### 5. Landlord Contact Check (Step 2)
- **Sent to:** Landlord
- **When:** Vendor reports "can't reach"
- **Subject:** `Did {Vendor} reach out about your {service} project?`
- **Buttons:** Yes, They Contacted Me (green) | No, Haven't Heard From Them (red)

### 6. Vendor Completion Check (Step 5)
- **Sent to:** Vendor
- **When:** 7 days after expected completion date
- **Subject:** `Job update: {Service} project with {Landlord}`
- **Buttons:** Job Completed (green) | Still In Progress (blue) | Job Cancelled (red)

### 7. Vendor Invoice Request (Step 5A)
- **Sent to:** Vendor
- **When:** Immediately after "completed" response
- **Subject:** `Invoice details: {Service} project with {Landlord}`
- **Buttons:** Under $500 | $500–$1,000 | $1,000–$2,500 | $2,500–$5,000 | $5,000+

### 8. Vendor Cancellation Reason (Step 5C)
- **Sent to:** Vendor
- **When:** Immediately after "cancelled" response
- **Subject:** `Cancelled: {Service} project with {Landlord}`
- **Buttons:** Price (yellow) | Scope (blue) | Chose Another Vendor (purple) | Other (red)

### 9. Landlord Feedback Request (Step 6)
- **Sent to:** Landlord
- **When:** Immediately after vendor provides invoice value
- **Subject:** `How was your experience with {Vendor}?`
- **Buttons:** Great (green) | OK (blue) | Not Good (red)

### SMS Companions
Emails #1, #2, #4, #5, #6, and #9 have SMS companions directing recipients to check their email. SMS is sent alongside the email when the recipient has a phone number on file.

---

## Token System

Response links use HMAC-SHA256 signed tokens to authenticate vendors and landlords without requiring login.

### Token Format
```
{followupId}.{type}.{unixTimestamp}.{hmacHex}
```

- **followupId:** UUID of the `match_followups` record
- **type:** `vendor` or `landlord`
- **unixTimestamp:** When the token was generated (seconds)
- **hmacHex:** SHA-256 HMAC of `{followupId}.{type}.{timestamp}` using `FOLLOWUP_TOKEN_SECRET`

### Security Properties
- **Signed:** Cannot be forged without the secret
- **Time-limited:** Expires after 30 days
- **Single-use:** Token is stored in `match_followups` and cleared after response
- **Type-bound:** A vendor token cannot be used as a landlord token
- **Tamper-proof:** Constant-time comparison prevents timing attacks

### Response URL Structure
```
{APP_URL}/api/follow-up/respond?token={token}&action={action}
```

Each email button appends a different `action` parameter to the same base URL.

---

## Cron Job

**Endpoint:** `GET /api/cron/follow-up-system`
**Schedule:** Every 6 hours (`0 */6 * * *` via `vercel.json`)
**Auth:** `Authorization: Bearer {CRON_SECRET}`

### What it does

1. Queries `match_followups` where `next_action_at <= now()` and stage is not `closed` or `needs_rematch`
2. For each record, based on current stage:
   - `pending` -> Sends Day 3 vendor check email, transitions to `vendor_check_sent`
   - `vendor_discussing` / `landlord_contact_ok` -> Sends Day 7 recheck email, transitions to `day7_recheck_sent`
   - `landlord_check_sent` (without existing landlord token) -> Sends landlord contact check email
   - `awaiting_completion` -> Sends completion check email, transitions to `completion_check_sent`
3. Generates a fresh token for each email sent
4. Logs an `email_sent` event for each send
5. 600ms delay between sends (Resend rate limit)

### Response
```json
{
  "message": "Follow-up system processed",
  "processed": 5,
  "sent": 4,
  "errors": 1
}
```

### Deprecated Route
The old `/api/cron/follow-up` endpoint now returns a deprecation message. It is safe to remove the old cron schedule.

---

## Admin Override

Admins can manually advance or set the follow-up stage when a vendor or landlord responds outside of email (by phone, text, etc.).

### Two Override Modes

**1. Response action** — Runs the same state machine logic as email responses:
```json
PATCH /api/admin/followups/{matchId}
{ "response": "booked" }
```
This respects the state machine rules but allows admin to bypass stage validation (admins can trigger any action from any stage).

**2. Direct stage set** — Directly sets the stage without running state machine logic:
```json
PATCH /api/admin/followups/{matchId}
{ "stage": "closed", "notes": "Landlord resolved directly via phone" }
```

Both modes log an `admin_override` event with the admin's user ID.

---

## API Reference

### `GET /api/follow-up/respond`
Public (no auth). Token-based response endpoint for email links.

| Param | Type | Description |
|---|---|---|
| `token` | string | HMAC-signed follow-up token |
| `action` | string | Response action (see actions below) |

**Vendor actions:** `booked`, `discussing`, `cant_reach`, `no_deal`
**Timeline actions:** `timeline_1_2_days`, `timeline_3_5_days`, `timeline_1_2_weeks`, `timeline_longer`
**Landlord actions:** `contact_ok`, `no_contact`
**Completion actions:** `completed`, `in_progress`, `cancelled`
**Invoice actions:** `invoice_under_500`, `invoice_500_1000`, `invoice_1000_2500`, `invoice_2500_5000`, `invoice_5000_plus`
**Cancellation reason actions:** `cancel_reason_price`, `cancel_reason_scope`, `cancel_reason_other_vendor`, `cancel_reason_other`
**Feedback actions:** `feedback_great`, `feedback_ok`, `feedback_not_good`

**Redirects to:**
- `/follow-up/thanks?action={action}` on success
- `/follow-up/invalid` on bad/used token
- `/follow-up/expired` on expired token

---

### `GET /api/admin/followups/{matchId}`
Admin only. Returns the follow-up record and full event history.

**Response:**
```json
{
  "followup": {
    "id": "uuid",
    "match_id": "uuid",
    "request_id": "uuid",
    "stage": "vendor_check_sent",
    "next_action_at": "2026-04-02T00:00:00Z",
    "vendor_response_token": "...",
    "landlord_response_token": null,
    "expected_completion_date": null,
    "created_at": "...",
    "updated_at": "..."
  },
  "events": [
    {
      "id": "uuid",
      "followup_id": "uuid",
      "event_type": "email_sent",
      "from_stage": "pending",
      "to_stage": "vendor_check_sent",
      "channel": "email",
      "response_value": null,
      "notes": null,
      "created_by": null,
      "created_at": "..."
    }
  ]
}
```

---

### `PATCH /api/admin/followups/{matchId}`
Admin only. Override follow-up stage or record a response.

**Request body (response mode):**
```json
{
  "response": "booked",
  "notes": "Vendor confirmed by phone"
}
```

**Request body (direct stage mode):**
```json
{
  "stage": "closed",
  "expected_completion_date": "2026-05-01",
  "notes": "Resolved offline"
}
```

---

### `GET /api/cron/follow-up-system`
Cron only. Processes pending follow-ups. See [Cron Job](#cron-job) section.

---

## Database Schema

### `match_followups`
One row per match. Created automatically by a DB trigger when `intro_sent` flips to `true`.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `match_id` | UUID (unique, FK) | References `request_vendor_matches` |
| `request_id` | UUID (FK) | References `service_requests` |
| `stage` | `followup_stage` enum | Current stage in the state machine |
| `next_action_at` | timestamptz | When the cron should process this record next |
| `vendor_response_token` | text | Active HMAC token for vendor response |
| `landlord_response_token` | text | Active HMAC token for landlord response |
| `expected_completion_date` | date | When the vendor expects to finish (set via timeline response) |
| `invoice_value` | numeric | Invoice value reported by vendor on completion (midpoint of selected range) |
| `cancellation_reason` | text | Why the job was cancelled: `price`, `scope`, `chose_another_vendor`, `other` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

**Indexes:**
- Partial index on `next_action_at` (excludes closed/needs_rematch) for efficient cron queries
- Index on `stage`
- Index on `match_id`

### `followup_events`
Append-only audit trail. Every stage transition, email, response, and admin override is logged.

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `followup_id` | UUID (FK) | References `match_followups` |
| `event_type` | text | `email_sent`, `sms_sent`, `response_received`, `admin_override`, `stage_changed` |
| `from_stage` | `followup_stage` | Stage before the event |
| `to_stage` | `followup_stage` | Stage after the event |
| `channel` | text | `email`, `sms`, `admin`, `system` |
| `response_value` | text | The action taken (e.g., `booked`, `no_deal`) |
| `notes` | text | Free-text notes (used by admin overrides) |
| `created_by` | UUID | Admin user ID for manual actions; null for automated |
| `created_at` | timestamptz | |

### DB Trigger
`trg_create_followup_on_intro_sent` fires on `UPDATE OF intro_sent` on `request_vendor_matches`. When `intro_sent` changes from false/null to true, it inserts a `match_followups` row with:
- `stage = 'pending'`
- `next_action_at = now() + 3 days`
- Uses `ON CONFLICT DO NOTHING` to prevent duplicates

### RLS
Both tables have RLS enabled. Only the `service_role` has access (all API routes use `createAdminClient()`). No public or authenticated user access.

---

## CRM Integration

The CRM page (`/crm`) displays a **Follow-Up** column for each job, showing a color-coded `FollowUpBadge` component.

### Badge Colors
| Color | Stages |
|---|---|
| Green (success) | `vendor_booked`, `job_completed` |
| Blue | `vendor_discussing`, `landlord_contact_ok` |
| Purple | `awaiting_completion`, `job_in_progress` |
| Yellow (processing) | `vendor_check_sent`, `day7_recheck_sent`, `landlord_check_sent`, `completion_check_sent` |
| Red (error) | `vendor_cant_reach`, `vendor_no_deal`, `needs_rematch`, `job_cancelled` |
| Default (gray) | `pending`, `closed` |

Each badge has a tooltip explaining what the stage means.

The follow-up stage is fetched via `fetchFollowupStagesByMatchIds()` in the CRM jobs API and attached to each job as `followup_stage`.

---

## Feature Flag

The entire system is gated behind the `FOLLOW_UP_SYSTEM_ENABLED` environment variable, checked by `isFollowUpSystemEnabled()` in `src/lib/followup/config.ts`.

### What happens when disabled (default)

| Component | Behavior |
|---|---|
| **DB trigger** | Still fires — `match_followups` rows are created so data accumulates for when you enable the system |
| **Cron endpoint** | Returns `200` with `"Follow-up system is disabled"` message |
| **Response endpoint** | Redirects to `/follow-up/invalid` |
| **Admin API** | Works normally (reads/writes to the DB regardless of flag) |
| **CRM badge** | Shows the stage from the DB (will be `pending` for all until cron runs) |

### What changes when enabled

The cron starts processing pending follow-ups and sending emails. Response links in those emails become functional.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `FOLLOW_UP_SYSTEM_ENABLED` | No | `false` | Set to `true` to activate the follow-up system |
| `FOLLOWUP_TOKEN_SECRET` | When enabled | None | Random string (32+ characters) used to sign response tokens |
| `CRON_SECRET` | Yes | None | Existing cron auth (shared with other cron routes) |
| `RESEND_API_KEY` | For emails | None | Existing Resend config (emails skip when absent) |
| `SMS_ENABLED` | For SMS | `false` | Must be `true` along with Telnyx credentials to send SMS |
| `TELNYX_API_KEY` | For SMS | None | Telnyx API key (SMS skips when absent) |
| `TELNYX_PHONE_NUMBER` | For SMS | None | Telnyx sending number in E.164 format |

---

## File Map

```
src/lib/followup/
  config.ts                          # Feature flag check
  tokens.ts                          # HMAC token generation + verification
  handler.ts                         # State machine (all response handling)
  processor.ts                       # Cron processing logic + email/SMS sending

src/lib/email/
  templates.ts                       # emailWrapper() exported for reuse
  followup-templates.ts              # 5 follow-up email templates

src/lib/sms/
  followup-templates.ts              # 4 SMS companion templates

src/app/api/
  follow-up/respond/route.ts         # Public token-based response endpoint
  admin/followups/[matchId]/route.ts # Admin GET + PATCH
  cron/follow-up-system/route.ts     # New cron endpoint
  cron/follow-up/route.ts            # Old cron (deprecated)

src/app/follow-up/
  thanks/page.tsx                    # Success landing page
  invalid/page.tsx                   # Invalid/used token page
  expired/page.tsx                   # Expired token page

src/components/admin/
  FollowUpBadge.tsx                  # Color-coded stage badge for CRM

src/lib/crm/
  job-query.ts                       # fetchFollowupStagesByMatchIds() added

src/types/
  database.ts                        # FollowupStage, MatchFollowup, FollowupEvent types

supabase/migrations/
  026_follow_up_system.sql           # Tables, enum, triggers, RLS

vercel.json                          # Cron schedule (every 6 hours)

src/__tests__/unit/followup/
  tokens.test.ts                     # 13 tests: generation, verification, expiry, tampering
  handler.test.ts                    # 13 tests: each response type, stage validation, admin override
  processor.test.ts                  # 5 tests: cron processing, error handling
```

---

## Testing

### Unit Tests

37 tests across 3 test files:

```bash
npx jest src/__tests__/unit/followup/ --no-coverage
```

**Token tests** (`tokens.test.ts`): Correct format, vendor vs landlord, different IDs, valid verification, empty/malformed/tampered tokens, expiry detection, boundary expiry, missing secret.

**Handler tests** (`handler.test.ts`): Each of the 9 response actions (booked, discussing, cant_reach, no_deal, contact_ok, no_contact, completed, in_progress, cancelled), invalid stage rejection, missing followup handling, admin bypass of stage validation.

**Processor tests** (`processor.test.ts`): Empty result set, pending -> Day 3 send, vendor_discussing -> Day 7 recheck, awaiting_completion -> completion check, database error handling.

### Manual Testing

1. **Trigger creation:** Set `intro_sent=true` on a match -> verify a `match_followups` row appears with `stage='pending'` and `next_action_at` ~3 days out.

2. **Cron processing:** Manually set `next_action_at` to the past on a pending followup, then hit the cron endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/follow-up-system
   ```
   Verify the email is sent and stage transitions to `vendor_check_sent`.

3. **Response flow:** Copy the response URL from the sent email, open in browser. Verify redirect to `/follow-up/thanks`, stage transition in DB, and token cleared.

4. **Admin override:**
   ```bash
   curl -X PATCH http://localhost:3000/api/admin/followups/{matchId} \
     -H "Content-Type: application/json" \
     -d '{"response": "booked", "notes": "Confirmed by phone"}'
   ```

5. **Edge cases:** Try using the same link twice (should show "invalid"). Try a link after 30+ days (should show "expired"). Try an action that doesn't match the current stage (should show "invalid").

---

## Activation Checklist

When you're ready to go live:

- [ ] Run migration `026_follow_up_system.sql` on your Supabase database
- [ ] Generate a random secret: `openssl rand -hex 32`
- [ ] Set `FOLLOWUP_TOKEN_SECRET` in Vercel environment variables (production + preview)
- [ ] Set `FOLLOW_UP_SYSTEM_ENABLED=true` in Vercel environment variables
- [ ] Deploy (Vercel will pick up the cron schedule from `vercel.json`)
- [ ] Verify the cron is registered: check Vercel dashboard -> Settings -> Cron Jobs
- [ ] Send a test intro to confirm the full flow works end-to-end
- [ ] Monitor the first few cron runs via Vercel function logs

### Rollback
To disable without removing code: set `FOLLOW_UP_SYSTEM_ENABLED=false`. The cron will stop processing, response links will redirect to the invalid page. Existing `match_followups` data is preserved.

---

## Troubleshooting

### Emails not sending
- Check `RESEND_API_KEY` is set and valid
- Check Vercel function logs for `[FollowUp] Email error` messages
- Confirm `FOLLOW_UP_SYSTEM_ENABLED=true`

### Cron not running
- Verify `vercel.json` cron schedule is deployed
- Check Vercel dashboard -> Cron Jobs for execution history
- Manually hit the endpoint with `curl` to test

### Tokens showing as invalid
- Verify `FOLLOWUP_TOKEN_SECRET` is the same across all instances (no rotation mid-cycle)
- Check if the token was already used (tokens are single-use)
- Check if the follow-up stage already advanced past the expected stage

### Follow-ups stuck in "pending"
- Cron may not have run yet (runs every 6 hours)
- Feature flag may be disabled
- `next_action_at` may be in the future — check the DB value

### Admin override not working
- Ensure you're using the match ID (not the followup ID) in the URL
- Check that a `match_followups` row exists for that match
- If using `response` mode, check that the action is valid for the current stage (admin bypasses this, but the action still needs to be a recognized value)
