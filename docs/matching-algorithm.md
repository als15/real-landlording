# Matching Algorithm

This document explains how Real Landlording matches vendors to service requests.

## Overview

The matching system uses a **two-tier scoring approach**:

1. **Vetting Score** - A static score measuring vendor quality and trustworthiness
2. **Match Score** - A dynamic score measuring how well a vendor fits a specific request

Together, these scores help admins quickly identify the best vendors for each job.

---

## Vetting Score (0-100 points)

The vetting score is calculated once when a vendor applies and updated whenever their credentials change. It answers: **"How qualified and trustworthy is this vendor?"**

### Scoring Breakdown

| Factor | Points | Description |
|--------|--------|-------------|
| **Licensed** | 30 | Vendor holds relevant professional license |
| **Insured** | 30 | Vendor carries liability insurance |
| **Years in Business** | 0-40 | Experience level (see scale below) |

### Years in Business Scale

| Years | Points |
|-------|--------|
| 0-1 years | 0 |
| 2-4 years | 10 |
| 5-9 years | 20 |
| 10-14 years | 30 |
| 15+ years | 40 |

### Example Calculations

**Highly Vetted Vendor:**
- Licensed: ✓ (+30)
- Insured: ✓ (+30)
- 12 years in business (+30)
- **Total: 90/100**

**New Vendor:**
- Licensed: ✗ (0)
- Insured: ✓ (+30)
- 2 years in business (+10)
- **Total: 40/100**

### When Vetting Score is Calculated

- When vendor submits application
- When admin updates vendor's license/insurance/years in business
- Score is stored in the `vetting_score` field on the vendor record

---

## Match Score (0-100 points)

The match score is calculated dynamically when matching vendors to a specific request. It answers: **"How well does this vendor fit this particular job?"**

### Scoring Breakdown

| Factor | Points | Description |
|--------|--------|-------------|
| **Service Type Match** | 30 | Vendor offers the exact service needed |
| **Location Match** | 25 | Vendor's service area includes the property zip code |
| **Vetting Score** | 0-25 | Scaled from vendor's vetting score (vetting × 0.25) |
| **Rental Experience** | 10 | Vendor has experience with rental properties |
| **Availability** | 10 | Vendor status is "active" |

### Matching Logic

```
Match Score = Service Match (30)
            + Location Match (25)
            + (Vetting Score × 0.25)
            + Rental Experience (10)
            + Availability (10)
```

### Example Calculation

**Request:** Plumber needed in zip code 19103

**Vendor A:**
- Services: plumber_sewer ✓ (+30)
- Service areas: 19103, 19104 ✓ (+25)
- Vetting score: 80 (+20)
- Rental experience: ✓ (+10)
- Status: active ✓ (+10)
- **Match Score: 95/100**

**Vendor B:**
- Services: plumber_sewer ✓ (+30)
- Service areas: 19106, 19107 ✗ (0)
- Vetting score: 60 (+15)
- Rental experience: ✗ (0)
- Status: active ✓ (+10)
- **Match Score: 55/100**

---

## Matching Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. REQUEST SUBMITTED                          │
│                                                                  │
│  Landlord submits request with:                                  │
│  • Service type (e.g., plumber_sewer)                           │
│  • Property zip code (e.g., 19103)                              │
│  • Job description, urgency, etc.                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. ADMIN OPENS MATCH MODAL                    │
│                                                                  │
│  System queries all active vendors and calculates               │
│  match score for each one against this request                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. VENDORS RANKED BY SCORE                    │
│                                                                  │
│  Vendors displayed in descending order by match score:          │
│  1. ABC Plumbing (Score: 95) ✓ Service ✓ Location              │
│  2. Quick Fix Co (Score: 85) ✓ Service ✓ Location              │
│  3. Handy Helpers (Score: 55) ✓ Service ✗ Location             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. ADMIN SELECTS VENDORS                      │
│                                                                  │
│  Admin can select up to 3 vendors to match                      │
│  Score guides selection but admin has final say                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. INTRO EMAILS SENT                          │
│                                                                  │
│  • Landlord receives email with vendor contact info             │
│  • Each vendor receives email with job details                  │
│  • Request status changes to "matched"                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Filtering Before Scoring

Before calculating match scores, the system filters vendors:

1. **Status Filter** - Only "active" vendors are considered
2. **Service Filter** - Only vendors offering the requested service type
3. **Location Filter** (optional) - Can filter to vendors serving the zip code

Vendors not meeting these criteria may still appear but with lower scores.

---

## Admin Override

The scoring system is a **recommendation tool**, not a strict rule:

- Admins see scores but can select any vendor
- Admins can match vendors with lower scores if they have specific knowledge
- Admins can add notes explaining match decisions
- The system supports manual vendor additions by admins

---

## Score Display in Admin UI

When admin opens the match modal:

| Vendor | Match Score | Service | Location | Vetting |
|--------|-------------|---------|----------|---------|
| ABC Plumbing | 95 | ✓ | ✓ | 80 |
| Quick Fix | 85 | ✓ | ✓ | 60 |
| Handy Helpers | 55 | ✓ | ✗ | 40 |

Color coding:
- **Green (80+)**: Excellent match
- **Yellow (50-79)**: Good match
- **Red (<50)**: Poor match

---

## Future Enhancements

Planned improvements to the matching algorithm:

1. **Performance History** - Factor in past job completion rates
2. **Response Time** - Vendors who respond quickly get bonus points
3. **Landlord Reviews** - Incorporate feedback from completed jobs
4. **Specialty Matching** - Match sub-specialties (e.g., "gas furnace" for HVAC)
5. **Urgency Weighting** - Prioritize vendors known for fast response on emergencies
6. **AI-Assisted Matching** - Learn from successful matches over time

---

## Code Reference

| File | Purpose |
|------|---------|
| `src/lib/scoring/vetting.ts` | Vetting score calculation |
| `src/lib/scoring/matching.ts` | Match score calculation |
| `src/components/admin/VendorMatchingModal.tsx` | UI for vendor selection |
| `src/app/api/requests/[id]/match/route.ts` | API endpoint for creating matches |

---

## Database Fields

**vendors table:**
- `vetting_score` - Calculated vetting score (0-100)
- `vetting_admin_adjustment` - Manual adjustment by admin (+/-)
- `licensed` - Boolean
- `insured` - Boolean
- `years_in_business` - Integer
- `rental_experience` - Boolean
- `services` - Array of service types
- `service_areas` - Array of zip codes

**request_vendor_matches table:**
- `request_id` - The service request
- `vendor_id` - The matched vendor
- `intro_sent` - Whether intro email was sent
- `intro_sent_at` - Timestamp of intro email
