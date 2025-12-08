# Service Request Page (`/request`) - Recommendations

**Date:** December 8, 2024
**Project:** Real Landlording Platform
**Document Type:** UI/UX Specification

---

## Executive Summary

This document outlines recommendations for improving the `/request` page based on analysis of the existing WordPress forms at reallandlording.com. The goal is to align the new platform with established user expectations while leveraging the enhanced service taxonomy we've built.

---

## Current State Analysis

### WordPress Service Request Form (`/prolink/schedule-repairs/`)

The WordPress form uses a **two-step process** and collects comprehensive property and project information:

#### Step 1 - Basic Information
| Field | Type | Required |
|-------|------|----------|
| Full name | Text | Yes |
| Email | Text | Yes |
| Phone | Text | Yes |
| Property address | Text | Yes |
| Zip code | Text | Yes |
| Unit count | Dropdown (1, 2-10, 11-99, 100+) | Yes |
| Bedroom count | Dropdown (1-5+) | No |
| Square footage | Text | No |
| Owner status | Radio (Yes/No) | Yes |
| Occupancy status | Radio (Yes/No) | Yes |

#### Step 2 - Project Details
| Field | Type | Required |
|-------|------|----------|
| Property type | Dropdown | Yes |
| Project type | Dropdown | Yes |
| Vendor type | Dropdown (15+ categories) | Yes |
| Project description | Textarea | Yes |
| Budget range | Dropdown (9 tiers) | No |
| Finish level | Dropdown | No |
| Timeline | Radio buttons | Yes |
| Contact preference | Checkboxes | No |
| Comments | Textarea | No |

### Our Current `/request` Page

| Field | Status |
|-------|--------|
| Name, Email, Phone | ✅ Have |
| Property location | ✅ Have (single field) |
| Service type | ✅ Have (34 categories with sub-options) |
| Job description | ✅ Have |
| Urgency | ✅ Have |
| Budget | ⚠️ Have (min/max inputs, not tiered) |
| Property details | ❌ Missing |
| Contact preference | ❌ Missing |
| Two-step flow | ❌ Single form |

---

## Gap Analysis

### Missing Fields

1. **Property Information**
   - Separate zip code field (for easier vendor matching)
   - Property type (row home, single family, multi-family, etc.)
   - Unit count
   - Bedroom count
   - Occupancy status (occupied/vacant)

2. **Contact Preferences**
   - Preferred contact method (phone, email, text, WhatsApp)

3. **UX Elements**
   - Two-step form flow
   - Marketing copy and trust signals
   - FAQ section

### Fields to Modify

1. **Budget Range** - Change from min/max inputs to tiered dropdown
2. **Property Location** - Split into address + zip code

---

## Recommendations

### 1. Add Property Details Section

```
Property Information:
├── Property Address (street address) [Required]
├── Zip Code (separate field) [Required]
├── Property Type [Required]
│   ├── Row Home
│   ├── Single Family Detached
│   ├── Duplex
│   ├── Triplex
│   ├── Small Multi-Family (4-10 units)
│   ├── Large Multi-Family (11+ units)
│   ├── New Construction
│   └── Commercial
├── Unit Count
│   ├── 1
│   ├── 2-10
│   ├── 11-99
│   └── 100+
└── Occupancy Status [Required]
    ├── Occupied
    ├── Vacant
    └── Partially Occupied
```

### 2. Improve Budget Selection

Replace min/max number inputs with tiered dropdown (matches WordPress and reduces cognitive load):

```
Budget Range:
├── Under $500
├── $500 - $1,000
├── $1,000 - $2,500
├── $2,500 - $5,000
├── $5,000 - $10,000
├── $10,000 - $25,000
├── $25,000 - $50,000
├── $50,000 - $100,000
├── $100,000+
└── Not sure yet
```

### 3. Add Contact Preferences

```
Best way to reach you:
├── Phone
├── Email
├── Text
├── WhatsApp
└── No preference
```

### 4. Implement Two-Step Form

**Step 1: Contact & Property Info**
- Lighter cognitive load
- Collects essential matching data first
- Progress indicator (Step 1 of 2)

**Step 2: Service Details**
- Service type with dynamic sub-categories
- Job description
- Budget and urgency
- Submit button

### 5. Add Marketing Copy & Trust Signals

**Headline:** "Get Matched with Trusted Philadelphia Contractors"

**Trust signals to display:**
- "Response within 24-48 hours"
- "All vendors vetted for rental property experience"
- "No membership or subscription required"
- "2,900+ Philadelphia landlords trust us"

### 6. Add FAQ Section

Collapsible FAQ addressing common questions:
- "How are vendors selected?"
- "How quickly will I hear back?"
- "Is there a fee for using this service?"
- "What if I'm not satisfied with the vendors?"

---

## Proposed Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                     │
│  [Logo] Real Landlording          [Sign In]                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌───────────────────────────────┐ │
│  │                     │  │                               │ │
│  │  LEFT COLUMN (40%)  │  │  RIGHT COLUMN (60%)           │ │
│  │                     │  │                               │ │
│  │  "Get Matched with  │  │  ┌───────────────────────┐    │ │
│  │   Trusted Philly    │  │  │ STEP 1 of 2           │    │ │
│  │   Contractors"      │  │  │ Your Information      │    │ │
│  │                     │  │  ├───────────────────────┤    │ │
│  │  ✓ 24-48 hr response│  │  │ Name*     │ Email*    │    │ │
│  │  ✓ Vetted vendors   │  │  │ Phone     │ Contact   │    │ │
│  │  ✓ No membership    │  │  │           │ Preference│    │ │
│  │  ✓ 2,900+ landlords │  │  ├───────────────────────┤    │ │
│  │                     │  │  │ Property Address*     │    │ │
│  │                     │  │  │ Zip*  │ Property Type │    │ │
│  │                     │  │  │ Units │ Occupancy     │    │ │
│  │                     │  │  ├───────────────────────┤    │ │
│  │                     │  │  │        [Next →]       │    │ │
│  │                     │  │  └───────────────────────┘    │ │
│  │                     │  │                               │ │
│  └─────────────────────┘  └───────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  FAQ SECTION (Collapsible)                                  │
│  ▸ How are vendors selected?                                │
│  ▸ How quickly will I hear back?                            │
│  ▸ Is there a fee for this service?                         │
│  ▸ What if I'm not satisfied?                               │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                     │
│  Real Landlording © 2024 - Philadelphia's Landlord Community│
└─────────────────────────────────────────────────────────────┘
```

### Step 2 Form Layout

```
┌───────────────────────────────────────┐
│ STEP 2 of 2                           │
│ Project Details                       │
├───────────────────────────────────────┤
│                                       │
│ What service do you need?* [Dropdown] │
│                                       │
│ [Dynamic sub-category questions       │
│  appear based on service selection]   │
│                                       │
│ Describe the job*                     │
│ ┌───────────────────────────────────┐ │
│ │                                   │ │
│ │ (textarea)                        │ │
│ │                                   │ │
│ └───────────────────────────────────┘ │
│                                       │
│ How urgent?*    │  Budget Range       │
│ [Dropdown]      │  [Dropdown]         │
│                                       │
├───────────────────────────────────────┤
│    [← Back]              [Submit]     │
└───────────────────────────────────────┘
```

---

## Database Changes Required

### New Fields for `service_requests` Table

```sql
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS unit_count VARCHAR(20);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS occupancy_status VARCHAR(20);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(20);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS budget_range VARCHAR(30);
```

### Updated TypeScript Types

```typescript
export type PropertyType =
  | 'row_home'
  | 'single_family'
  | 'duplex'
  | 'triplex'
  | 'small_multi'    // 4-10 units
  | 'large_multi'    // 11+ units
  | 'new_construction'
  | 'commercial';

export type UnitCount = '1' | '2-10' | '11-99' | '100+';

export type OccupancyStatus = 'occupied' | 'vacant' | 'partial';

export type ContactPreference = 'phone' | 'email' | 'text' | 'whatsapp' | 'no_preference';

export type BudgetRange =
  | 'under_500'
  | '500_1000'
  | '1000_2500'
  | '2500_5000'
  | '5000_10000'
  | '10000_25000'
  | '25000_50000'
  | '50000_100000'
  | 'over_100000'
  | 'not_sure';

export interface ServiceRequestInput {
  // Contact Info
  landlord_email: string;
  landlord_name?: string;
  landlord_phone?: string;
  contact_preference?: ContactPreference;

  // Property Info
  property_address: string;
  zip_code: string;
  property_type?: PropertyType;
  unit_count?: UnitCount;
  occupancy_status?: OccupancyStatus;

  // Service Info
  service_type: ServiceCategory;
  service_details?: Record<string, string>;
  job_description: string;
  urgency: UrgencyLevel;
  budget_range?: BudgetRange;
}
```

---

## Implementation Priority

### Phase 1 (MVP)
1. Add property type and zip code fields
2. Add contact preference
3. Change budget to tiered dropdown
4. Add marketing copy to left column

### Phase 2 (Enhancement)
1. Implement two-step form flow
2. Add unit count and occupancy fields
3. Add FAQ section

### Phase 3 (Polish)
1. Add progress animations
2. Form validation improvements
3. Mobile optimization

---

## Comparison: Before & After

| Aspect | Current | Proposed |
|--------|---------|----------|
| Form steps | 1 | 2 |
| Fields | 8 | 14 |
| Property context | Minimal | Comprehensive |
| Marketing copy | Basic | Trust-building |
| FAQ | None | 4 questions |
| Budget input | Min/Max numbers | Tiered dropdown |
| Mobile UX | Functional | Optimized |

---

## Appendix: WordPress Form Reference URLs

- **Vendor Registration:** https://reallandlording.com/register-as-vendor/
- **Service Request:** https://reallandlording.com/prolink/schedule-repairs/
- **ProLink Landing:** https://reallandlording.com/prolink/

---

*Document generated for Real Landlording Platform development*
