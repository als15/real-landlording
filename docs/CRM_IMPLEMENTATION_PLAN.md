# CRM Feature Implementation Plan

## Overview

This document outlines the implementation plan for a CRM-like feature to help manage the complete lifecycle of vendor-landlord jobs, including tracking job outcomes, payments, and collecting statistics for conversion analysis.

---

## User Requirements Summary

Based on the call with your colleague, she needs to:

1. **Track Job Lifecycle Timeline:**
   - Did vendor get the job?
   - Did the vendor get paid?
   - How much was paid?
   - Did they complete the job?
   - Was review collected?

2. **Analytics & Insights:**
   - Which projects (service types) are most converting?
   - Which vendors are most converting?
   - Help collecting statistics

---

## Current State Analysis

### What Already Exists ✓
- Match status tracking (pending → intro_sent → accepted/declined → completed)
- `job_completed` boolean flag
- Review collection (rating + multi-dimensional scores)
- Vendor performance scoring
- Basic analytics (requests by type, vendor leaderboard)

### What's Missing ✗
- **Payment tracking** (status, amount, dates)
- **Job completion timestamps**
- **Job outcome details** (why won/lost)
- **Conversion rate analytics** (by service type, by vendor)
- **CRM-style timeline view**
- **Payment management interface**

---

## Implementation Plan

### Phase 1: Database Schema Enhancements

#### 1.1 New Table: `referral_payments`

Tracks all payment-related information for completed jobs.

```sql
CREATE TABLE referral_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES request_vendor_matches(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  fee_type VARCHAR(20) DEFAULT 'fixed', -- 'fixed' | 'percentage'
  fee_percentage DECIMAL(5, 2),

  -- Job cost (what landlord paid vendor)
  job_cost DECIMAL(10, 2),

  -- Payment status
  status VARCHAR(50) DEFAULT 'pending',
  -- Values: pending | invoiced | paid | overdue | waived | refunded

  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,

  -- Payment method
  payment_method VARCHAR(50), -- stripe | check | ach | venmo | cash | other
  payment_reference VARCHAR(255), -- Transaction ID / Check number

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_referral_payments_vendor_id ON referral_payments(vendor_id);
CREATE INDEX idx_referral_payments_status ON referral_payments(status);
CREATE INDEX idx_referral_payments_paid_date ON referral_payments(paid_date);
```

#### 1.2 Enhance `request_vendor_matches` Table

Add fields to track job lifecycle better:

```sql
ALTER TABLE request_vendor_matches
  ADD COLUMN IF NOT EXISTS job_won BOOLEAN,
  ADD COLUMN IF NOT EXISTS job_won_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS job_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS job_outcome_reason VARCHAR(100),
  -- Values: price_too_high | timing_issue | vendor_unresponsive |
  --         landlord_cancelled | found_other_vendor | job_not_needed | other
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMP WITH TIME ZONE;
```

#### 1.3 Add Vendor Default Fee Configuration

```sql
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS default_fee_type VARCHAR(20) DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS default_fee_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_fee_percentage DECIMAL(5, 2);
```

---

### Phase 2: New Admin Pages

#### 2.1 CRM Dashboard (`/admin/crm`)

**Main CRM hub with pipeline view and quick stats.**

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CRM Dashboard                                          [Export]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ Intro    │ │ Vendor   │ │ Job In   │ │ Completed│ │ Paid   ││
│  │ Sent     │ │ Accepted │ │ Progress │ │          │ │        ││
│  │   12     │ │    8     │ │    5     │ │    23    │ │   18   ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Active Jobs Pipeline (Filterable Table)                     ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ Request   │ Landlord │ Vendor  │ Service │ Stage  │ Actions ││
│  │ #1234     │ John D.  │ ABC Co  │ HVAC    │ Won ✓  │ [View]  ││
│  │ #1233     │ Jane S.  │ XYZ Inc │ Plumb   │ Intro  │ [View]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌────────────────────────────┐ ┌──────────────────────────────┐│
│  │ Pending Payments           │ │ Recent Completions           ││
│  │ 5 invoices ($2,340 total)  │ │ 8 jobs this week             ││
│  │ [View All]                 │ │ [View All]                   ││
│  └────────────────────────────┘ └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Pipeline stage counts (visual funnel)
- Filterable job table with all lifecycle stages
- Quick action buttons (mark won, mark complete, record payment)
- Pending payments widget
- Recent completions widget

#### 2.2 Job Detail Drawer (Enhanced)

**Timeline view showing complete job lifecycle.**

```
┌─────────────────────────────────────────────────────────────────┐
│  Job #1234 - HVAC Repair                              [Close X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Landlord: John Doe (john@email.com)                           │
│  Vendor: ABC Heating & Cooling                                  │
│  Service: HVAC - No Heat                                        │
│  Property: 123 Main St, Philadelphia 19103                      │
│                                                                 │
│  ─────────────── Timeline ───────────────                       │
│                                                                 │
│  ● Request Submitted          Jan 15, 2024 10:30 AM            │
│  │                                                              │
│  ● Intro Sent                 Jan 15, 2024 2:15 PM             │
│  │                                                              │
│  ● Vendor Accepted            Jan 15, 2024 4:30 PM  (2h 15m)   │
│  │                                                              │
│  ◐ Job Won                    [ Mark as Won ] [ Mark as Lost ] │
│  │                                                              │
│  ○ Job Completed              [Not yet]                        │
│  │                                                              │
│  ○ Payment Received           [Not yet]                        │
│  │                                                              │
│  ○ Review Collected           [Not yet]                        │
│                                                                 │
│  ─────────────── Actions ───────────────                        │
│                                                                 │
│  [Mark Job Won] [Mark Completed] [Record Payment] [Request Review]│
│                                                                 │
│  ─────────────── Notes ───────────────                          │
│  Admin notes field...                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3 Payments Page (`/admin/payments`)

**Dedicated page for payment management.**

```
┌─────────────────────────────────────────────────────────────────┐
│  Payments                                    [Record Payment +] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Summary Cards:                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Pending    │ │ This Month │ │ This Year  │ │ Overdue    │   │
│  │ $2,340     │ │ $8,500     │ │ $45,200    │ │ $450       │   │
│  │ 5 invoices │ │ 23 paid    │ │ 156 paid   │ │ 2 invoices │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                                 │
│  Filters: [Status ▼] [Vendor ▼] [Date Range] [Service Type ▼]  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Payment Records                                              ││
│  │ ──────────────────────────────────────────────────────────── ││
│  │ Job     │ Vendor    │ Amount  │ Status  │ Due Date │ Actions││
│  │ #1234   │ ABC Co    │ $150    │ Pending │ Jan 30   │ [Pay]  ││
│  │ #1230   │ XYZ Inc   │ $200    │ Paid    │ Jan 25   │ [View] ││
│  │ #1228   │ 123 Plumb │ $175    │ Overdue │ Jan 20   │ [Pay]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Summary cards (pending, paid this month/year, overdue)
- Filterable payment table
- Bulk payment marking
- Payment history per vendor
- Export to CSV

#### 2.4 Enhanced Analytics (`/admin/analytics` - Add New Tab)

**New "Conversions" tab for conversion analytics.**

```
┌─────────────────────────────────────────────────────────────────┐
│  Analytics    [Overview] [Conversions] [Revenue]                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ─────────────── Conversion Metrics ───────────────             │
│                                                                 │
│  Funnel:                                                        │
│  Requests (100) → Matched (85%) → Won (62%) → Completed (58%)   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Conversion by Service Type                               │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ Service Type    │ Requests │ Won  │ Conv Rate │ Avg Time │   │
│  │ HVAC            │ 45       │ 32   │ 71%       │ 2.3 days │   │
│  │ Plumber         │ 38       │ 25   │ 66%       │ 1.8 days │   │
│  │ Electrician     │ 22       │ 12   │ 55%       │ 3.1 days │   │
│  │ Handyman        │ 56       │ 28   │ 50%       │ 2.5 days │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Top Converting Vendors                                   │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ Vendor          │ Matches │ Won  │ Conv Rate │ Revenue   │   │
│  │ ABC Heating     │ 28      │ 24   │ 86%       │ $3,600    │   │
│  │ Quick Plumb     │ 22      │ 18   │ 82%       │ $2,700    │   │
│  │ Pro Electric    │ 15      │ 11   │ 73%       │ $1,650    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐ ┌────────────────────────────────┐ │
│  │ Loss Reasons Breakdown  │ │ Avg Time to Win by Service     │ │
│  │ [Pie Chart]             │ │ [Bar Chart]                    │ │
│  └─────────────────────────┘ └────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 3: API Endpoints

#### 3.1 New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/crm/pipeline` | GET | Get pipeline stage counts |
| `/api/admin/crm/jobs` | GET | Get jobs with full lifecycle data |
| `/api/admin/matches/[id]/outcome` | PATCH | Update job outcome (won/lost) |
| `/api/admin/matches/[id]/complete` | PATCH | Mark job as completed |
| `/api/admin/payments` | GET | List all payments with filters |
| `/api/admin/payments` | POST | Create payment record |
| `/api/admin/payments/[id]` | PATCH | Update payment (mark paid, etc.) |
| `/api/admin/analytics/conversions` | GET | Get conversion analytics |

#### 3.2 Enhanced Existing Endpoints

| Endpoint | Changes |
|----------|---------|
| `/api/requests/[id]` | Include payment status in response |
| `/api/vendors/[id]` | Include earnings summary in response |

---

### Phase 4: Workflow Enhancements

#### 4.1 Job Outcome Tracking Workflow

```
Vendor Accepts Match
        │
        ▼
   ┌─────────────────┐
   │ Admin marks     │
   │ "Job Won" or    │
   │ "Job Lost"      │
   └────────┬────────┘
            │
     ┌──────┴──────┐
     │             │
   Won           Lost
     │             │
     ▼             ▼
┌─────────┐  ┌─────────────┐
│ Track   │  │ Record      │
│ to      │  │ loss reason │
│ complete│  │ & close     │
└────┬────┘  └─────────────┘
     │
     ▼
┌─────────────────┐
│ Admin marks     │
│ "Completed"     │
│ + job cost      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Payment record  │
│ auto-created    │
│ (pending)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin marks     │
│ payment as paid │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Request review  │
│ from landlord   │
└─────────────────┘
```

#### 4.2 Automated Actions

1. **Auto-create payment record** when job marked complete
2. **Auto-request review** after payment received (or X days after completion)
3. **Payment reminder** if overdue (optional email to admin)

---

## Implementation Phases & Order

### Phase 1: Foundation (Database + Core APIs)
1. Create migration for `referral_payments` table
2. Create migration for `request_vendor_matches` enhancements
3. Create migration for vendor fee configuration
4. Build payment CRUD API endpoints
5. Build job outcome API endpoints

### Phase 2: CRM Dashboard
1. Create `/admin/crm` page with pipeline view
2. Build enhanced job detail drawer with timeline
3. Add quick action buttons for job lifecycle
4. Implement job filtering and search

### Phase 3: Payments Page
1. Create `/admin/payments` page
2. Build payment recording modal
3. Implement bulk payment operations
4. Add payment filters and search

### Phase 4: Analytics Enhancement
1. Add conversion analytics API
2. Create "Conversions" tab in analytics page
3. Build conversion by service type table
4. Build top converting vendors table
5. Add loss reasons breakdown chart

### Phase 5: Polish & Automation
1. Auto-create payment on job completion
2. Review request automation
3. CSV export for all new views
4. Documentation updates

---

## Technical Considerations

### State Management
- Continue using React useState (consistent with current patterns)
- Add React Query or SWR in future if needed for caching

### UI Components
- Continue using Ant Design (consistent with current admin UI)
- Use existing utility functions (CSV export, etc.)

### Database
- All new tables follow existing RLS patterns
- Use `createAdminClient()` for admin operations
- Add appropriate indexes for query performance

### Performance
- Implement pagination on all list views
- Use database-level aggregations for analytics
- Consider caching for frequently-accessed stats

---

## Questions for Clarification

Before starting implementation, please confirm:

1. **Payment Tracking Granularity:**
   - Do you need to track multiple payments per job (partial payments)?
   - Or is it always one payment per completed job?

2. **Fee Structure:**
   - Are referral fees fixed amounts, percentages, or both?
   - Is there a default fee, or is it set per vendor?

3. **Payment Methods:**
   - What payment methods do vendors use? (Check, ACH, Stripe, Venmo, etc.)
   - Do you need to track actual payment processing, or just record that payment was received?

4. **Review Collection:**
   - Should the system auto-send review requests?
   - If so, how many days after job completion?

5. **Priority:**
   - Which feature is most urgent: Job tracking, Payment tracking, or Conversion analytics?

---

## Success Metrics

After implementation, your colleague should be able to:

- ✓ See at a glance which jobs are at what stage
- ✓ Track whether vendors got jobs (won/lost with reasons)
- ✓ Record and track all payments (amount, status, dates)
- ✓ See which service types convert best
- ✓ Identify top-performing vendors by conversion rate
- ✓ Generate reports for statistics collection
