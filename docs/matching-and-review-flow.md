# Matching and Review Flow

This document describes the complete flow from when an admin matches vendors to a request, through to landlord reviews and job completion.

## Overview

```
Landlord submits request → Admin matches vendors → Intro emails sent
                                                          ↓
                                         3-5 days later: Follow-up email
                                                          ↓
                                         Landlord submits review → Vendor score updated
```

---

## 1. Admin Matches Vendors

**Location:** `/requests` page (Admin Dashboard)

### Steps:
1. Admin clicks "Match" button on a request
2. Modal opens showing vendors filtered by:
   - Service type (must match request)
   - Status = `active`
3. Admin selects up to 3 vendors
4. Admin clicks "Match X Vendors"

### What Happens (Backend):

**API Endpoint:** `POST /api/requests/[id]/match`

| Step | Action | Database Change |
|------|--------|-----------------|
| 1 | Validate vendor IDs | - |
| 2 | Fetch request details | - |
| 3 | Fetch vendor details | - |
| 4 | Create match records | `INSERT INTO request_vendor_matches` |
| 5 | Update request status | `service_requests.status` → `matched` |
| 6 | Send intro emails | (async, non-blocking) |

### Database Changes:

**`service_requests` table:**
```sql
UPDATE service_requests SET
  status = 'matched',
  intro_sent_at = NOW()
WHERE id = request_id;
```

**`request_vendor_matches` table (new rows):**
```sql
INSERT INTO request_vendor_matches (request_id, vendor_id, intro_sent, intro_sent_at)
VALUES
  (request_id, vendor_1_id, true, NOW()),
  (request_id, vendor_2_id, true, NOW()),
  (request_id, vendor_3_id, true, NOW());
```

### Emails Sent:

1. **To Landlord:** "We've matched you with vendors for your [service] request"
   - Contains vendor contact info (name, business, phone, email)
   - Job details reminder

2. **To Each Vendor:** "You've been matched with a landlord request"
   - Contains landlord contact info
   - Property location and job description
   - Urgency level

---

## 2. Follow-Up Email (Automated)

**Trigger:** Cron job at `/api/cron/follow-up`

### Timing:
- Runs daily
- Finds requests where:
  - Status = `matched`
  - Intro sent 3-5 days ago
  - Follow-up not yet sent

### Email Content:
- Subject: "How did it go with your [service] vendors?"
- Contains link to `/dashboard` with "Leave a Review" button
- Lists matched vendor names

### Database Update:
```sql
UPDATE service_requests SET
  followup_sent_at = NOW()
WHERE id = request_id;
```

---

## 3. Landlord Submits Review

### Entry Points:

| Method | Description |
|--------|-------------|
| Follow-up email | Click "Leave a Review" button → `/dashboard` |
| Direct access | Landlord logs in → `/dashboard` → View Details → Leave Review |

### Review Flow:

```
/dashboard
    │
    ▼ Click "View Details" on a request
┌─────────────────────────────────────┐
│       Request Detail Modal          │
│  ─────────────────────────────────  │
│  Matched Vendors:                   │
│  • ABC Repair     [Leave Review]    │
│  • XYZ Services   [Leave Review]    │
└─────────────────────────────────────┘
    │
    ▼ Click "Leave Review"
┌─────────────────────────────────────┐
│         Review Modal                │
│  ─────────────────────────────────  │
│  Overall Rating: ★★★★★ (required)  │
│                                     │
│  Optional ratings:                  │
│  • Quality of Work                  │
│  • Price / Value                    │
│  • Timeliness                       │
│  • Professionalism                  │
│                                     │
│  Comments: [text area]              │
│                                     │
│        [Cancel] [Submit Review]     │
└─────────────────────────────────────┘
```

### What Happens (Backend):

**API Endpoint:** `POST /api/landlord/reviews`

| Step | Action |
|------|--------|
| 1 | Validate rating values (1-5) |
| 2 | Verify landlord owns this request |
| 3 | Update match record with review |
| 4 | Mark job as completed |
| 5 | Recalculate vendor performance score |

### Database Changes:

**`request_vendor_matches` table:**
```sql
UPDATE request_vendor_matches SET
  review_rating = 5,
  review_quality = 4,
  review_price = 5,
  review_timeline = 5,
  review_treatment = 4,
  review_text = 'Great service!',
  review_submitted_at = NOW(),
  job_completed = true
WHERE id = match_id;
```

**`vendors` table** (via `updateVendorScore`):
```sql
UPDATE vendors SET
  performance_score = [recalculated],
  total_reviews = total_reviews + 1
WHERE id = vendor_id;
```

---

## 4. Request Status Lifecycle

| Status | Meaning | Trigger |
|--------|---------|---------|
| `new` | Just submitted | Landlord submits request |
| `matching` | Being processed | Admin manually changes (optional) |
| `matched` | Vendors assigned | Admin clicks "Match" |
| `completed` | Job finished | Admin manually changes |
| `cancelled` | Request cancelled | Admin manually changes |

> **Note:** Currently, submitting a review marks `job_completed = true` on the match record, but does NOT automatically change the request status to `completed`. This requires manual admin action.

---

## 5. Vendor Performance Scoring

When a review is submitted, the vendor's score is recalculated based on:

- All review ratings
- Quality, price, timeline, treatment sub-ratings
- Historical performance data

**File:** `src/lib/scoring/calculate.ts`

The updated score affects:
- Vendor ranking in matching modal
- Display badges (Excellent, Good, Average, etc.)
- Admin visibility into vendor quality

---

## File References

| Purpose | File |
|---------|------|
| Match API | `src/app/api/requests/[id]/match/route.ts` |
| Review API | `src/app/api/landlord/reviews/route.ts` |
| Follow-up Cron | `src/app/api/cron/follow-up/route.ts` |
| Landlord Dashboard | `src/app/dashboard/page.tsx` |
| Vendor Matching Modal | `src/components/admin/VendorMatchingModal.tsx` |
| Email Templates | `src/lib/email/templates.ts` |
| Score Calculation | `src/lib/scoring/calculate.ts` |

---

## Sequence Diagram

```
┌──────────┐     ┌───────┐     ┌────────┐     ┌────────┐     ┌──────┐
│ Landlord │     │ Admin │     │ System │     │ Vendor │     │ Cron │
└────┬─────┘     └───┬───┘     └───┬────┘     └───┬────┘     └──┬───┘
     │               │             │              │              │
     │ Submit Request│             │              │              │
     │──────────────────────────>  │              │              │
     │               │             │              │              │
     │               │ Match Vendors              │              │
     │               │────────────>│              │              │
     │               │             │              │              │
     │               │             │ Create Matches              │
     │               │             │──────────────│              │
     │               │             │              │              │
     │  Intro Email  │             │ Intro Email  │              │
     │<─────────────────────────── │─────────────>│              │
     │               │             │              │              │
     │               │             │         3-5 days            │
     │               │             │              │              │
     │               │             │              │  Check for   │
     │               │             │              │  follow-ups  │
     │               │             │<─────────────────────────── │
     │               │             │              │              │
     │ Follow-up Email             │              │              │
     │<─────────────────────────── │              │              │
     │               │             │              │              │
     │ Submit Review │             │              │              │
     │──────────────────────────>  │              │              │
     │               │             │              │              │
     │               │             │ Update Score │              │
     │               │             │──────────────│              │
     │               │             │              │              │
     └───────────────┴─────────────┴──────────────┴──────────────┘
```
