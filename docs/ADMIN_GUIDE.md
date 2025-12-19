# Real Landlording Admin Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Service Requests](#managing-service-requests)
5. [Vendor Management](#vendor-management)
6. [Vendor Scoring System](#vendor-scoring-system)
7. [Vendor Applications](#vendor-applications)
8. [Landlord Management](#landlord-management)
9. [Matching Vendors to Requests](#matching-vendors-to-requests)
10. [Analytics & Reporting](#analytics--reporting)
11. [System Configuration](#system-configuration)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)
14. [Glossary](#glossary)

---

## Introduction

### Purpose of This Guide

This guide provides comprehensive instructions for administering the Real Landlording platform. As an admin, you are responsible for:

- Processing incoming service requests from landlords
- Managing the vendor network (approvals, status changes, performance monitoring)
- Matching vendors to requests and facilitating introductions
- Monitoring platform health and vendor quality
- Handling edge cases and escalations

### Platform Overview

Real Landlording connects Philadelphia landlords with vetted service vendors. The platform automates what was previously a manual matching process while maintaining the quality and trust that defines our brand.

**Key User Types:**
| User Type | Description | Access Level |
|-----------|-------------|--------------|
| Landlord | Property owners seeking services | Public + Dashboard |
| Vendor | Service providers in our network | Vendor Portal |
| Admin | Real Landlording team members | Full Admin Access |

### Admin Responsibilities

| Task | Frequency | Priority |
|------|-----------|----------|
| Review new service requests | Daily | High |
| Process vendor applications | Daily | High |
| Match vendors to requests | Daily | High |
| Monitor vendor performance | Weekly | Medium |
| Review suspended vendors | Weekly | Medium |
| Analyze platform metrics | Monthly | Medium |
| Update vendor information | As needed | Low |

---

## Getting Started

### Accessing the Admin Panel

1. Navigate to the platform URL
2. Click "Admin Login" or go directly to `/login`
3. Enter your admin credentials
4. You'll be redirected to the admin dashboard

### Navigation Structure

The admin area consists of the following main sections:

```
Admin Panel
├── Dashboard (/)          - Overview and quick stats
├── Requests (/requests)   - Service request queue
├── Vendors (/vendors)     - Vendor management
├── Applications (/applications) - Pending vendor applications
├── Landlords (/landlords) - Landlord directory
└── Analytics (/analytics) - Platform metrics
```

### Quick Actions from Dashboard

The main dashboard provides quick access to:
- **Pending Requests**: Requests awaiting vendor matching
- **New Applications**: Vendor applications needing review
- **Recent Activity**: Latest platform actions
- **Key Metrics**: Request volume, match rate, etc.

---

## Dashboard Overview

### Key Metrics Displayed

| Metric | Description | Good Target |
|--------|-------------|-------------|
| Pending Requests | Requests not yet matched | < 10 |
| Active Vendors | Vendors available for matching | 50+ |
| Match Rate | % of requests successfully matched | > 90% |
| Avg. Time to Match | Hours from request to introduction | < 24 hours |
| Pending Applications | Vendor applications awaiting review | < 5 |

### Status Indicators

- **Green**: Healthy, within targets
- **Yellow**: Attention needed, approaching limits
- **Red**: Urgent action required

---

## Managing Service Requests

### Request Lifecycle

```
New → Matching → Matched → Completed
         ↓
      Cancelled
```

| Status | Description | Admin Action |
|--------|-------------|--------------|
| New | Just submitted, awaiting review | Review and begin matching |
| Matching | Actively finding vendors | Select and confirm vendors |
| Matched | Vendors assigned, intro sent | Monitor for follow-up |
| Completed | Job finished, may have review | No action needed |
| Cancelled | Request withdrawn | Archive |

### Viewing Requests

**URL**: `/requests`

1. Navigate to Requests page
2. Use filters to narrow down:
   - **Status**: New, Matching, Matched, Completed, Cancelled
   - **Service Type**: Plumber, Electrician, HVAC, etc.
   - **Urgency**: Low, Medium, High, Emergency
   - **Date Range**: Filter by submission date
3. Click on a request to view full details

### Request Details View

When viewing a request, you'll see:

**Request Information:**
- Service type and description
- Property location (zip code or full address)
- Urgency level
- Submission date/time
- Current status

**Landlord Information:**
- Name and contact details
- Account status (registered or email-only)
- Previous request history

**Matched Vendors** (if any):
- Vendor names and contact info
- Match status
- Review status

### Processing a New Request

1. Open the request from the queue
2. Review the job description and requirements
3. Note the property location and urgency
4. Click "Match Vendors" to begin matching process
5. Select appropriate vendors (see [Matching Vendors](#matching-vendors-to-requests))
6. Confirm selection to send introduction emails

### Handling Special Cases

**Emergency Requests:**
- Prioritize immediately
- Consider calling vendors directly
- Match with vendors known for quick response

**Complex/Large Jobs:**
- May require specialist vendors or general contractors
- Consider matching multiple vendor types
- Add admin notes for context

**Repeat Landlords:**
- Check their history for vendor preferences
- Note any past issues or preferences

---

## Vendor Management

### Vendor Statuses

| Status | Description | Visible to Landlords | Receives Matches |
|--------|-------------|---------------------|------------------|
| Active | Fully operational | Yes | Yes |
| Inactive | Temporarily unavailable | No | No |
| Pending Review | New application | No | No |
| Rejected | Application denied | No | No |
| Suspended | Auto or manual suspension | No | No |

### Viewing Vendors

**URL**: `/vendors`

The vendor list displays:
- Business name and contact
- Services offered
- Rating and review count
- Current status
- Quick action buttons

**Filtering Options:**
- By status (Active, Inactive, etc.)
- By service type
- Search by name, email, or phone

### Vendor Detail View

Click the eye icon to open the vendor drawer with full details:

**Contact Information:**
- Business name
- Contact person name
- Email and phone
- Website
- Business location

**Services & Coverage:**
- Services offered (tags)
- Service areas (zip codes)

**Qualifications:**
- Licensed (Yes/No)
- Insured (Yes/No)
- Rental property experience
- Additional qualifications text

**Vetting Score:**
- Years in business
- Base vetting score (auto-calculated)
- Admin adjustment
- Total vetting score

**Performance:**
- Star rating
- Total review count
- (Performance score used in matching algorithm)

**Admin Notes:**
- Internal notes (not visible to vendor)

### Editing Vendor Information

Click the edit icon to open the edit modal:

1. **Contact Information**: Update name, email, phone, website, location
2. **Services**: Add or remove service types
3. **Service Areas**: Update zip codes served
4. **Qualifications**: Toggle licensed/insured/rental experience, update qualifications text
5. **Years in Business**: Select experience level (affects vetting score)
6. **Vetting Adjustment**: Use slider to adjust vetting score ±10 points
7. **Admin Notes**: Add internal notes

**Important**: Changes to licensed, insured, or years in business automatically recalculate the vetting score.

### Changing Vendor Status

**From the vendor drawer:**
1. Find the Status dropdown
2. Select new status
3. Status updates immediately

**When to change status:**
- **Active → Inactive**: Vendor requests temporary pause, seasonal business, capacity issues
- **Active → Suspended**: Serious complaints, policy violations, manual intervention needed
- **Inactive → Active**: Vendor ready to receive leads again
- **Suspended → Active**: After review and remediation

### Adding a New Vendor Manually

**URL**: `/vendors` → Click "Add Vendor"

Use this when onboarding a vendor directly (not through application):

1. Click "Add Vendor" button
2. Fill in required fields:
   - Contact name
   - Business name
   - Email
   - Services (at least one)
   - Service areas (at least one zip)
3. Fill optional fields as available
4. Click "Add Vendor"
5. Vendor is created with "Active" status

---

## Vendor Scoring System

### How Scoring Works

Every vendor has a **performance score** (0-100) calculated from multiple factors:

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| Review Score | 35% | Average landlord ratings (weighted by recency) |
| Completion Rate | 20% | % of accepted jobs completed |
| Response Time | 15% | How quickly vendor responds to matches |
| Vetting Score | 10% | Initial credentials and admin assessment |
| Acceptance Rate | 10% | % of matched jobs accepted |
| Volume Bonus | 5% | Reward for high job volume |
| Recency Bonus | 5% | Reward for recent activity |

**Penalties Applied:**
- No-shows: -5 points each
- Declining after accepting: -3 points each
- 1-star reviews: -2 points each (additional)

### Vendor Tiers

Scores translate to tiers that affect matching priority:

| Tier | Score Range | Badge Color | Matching Priority |
|------|-------------|-------------|-------------------|
| Excellent | 80-100 | Green | First choice for all matches |
| Good | 60-79 | Blue | Standard matching priority |
| Average | 40-59 | Orange | May need admin review before matching |
| Below Average | 20-39 | Red | Limited matching, close monitoring |
| Poor | 0-19 | Gray | Auto-suspended |
| New | 50 (default) | Default | Standard priority until reviewed |

### Vetting Score Deep Dive

The vetting score (max 45 points) represents vendor credentials:

**Automatic Calculation:**
| Factor | Points |
|--------|--------|
| Licensed in PA | +15 |
| Carries liability insurance | +10 |
| Years in business (scales) | 0-10 |

**Years in Business Scaling:**
- Less than 1 year: 0 points
- 1-2 years: 2-4 points
- 3-4 years: 6-8 points
- 5+ years: 10 points (maximum)

**Admin Adjustment:**
- Range: -10 to +10 points
- Use cases:
  - Exceptional portfolio review: +5 to +10
  - Concerning background findings: -5 to -10
  - Special certifications not captured: +3 to +5
  - Minor policy concerns: -3 to -5

### Understanding the Vetting Score Display

In the vendor edit modal, you'll see:

```
Vetting Score
┌─────────────────────────────────────┐
│ Base Vetting Score:        35       │
│ Admin Adjustment:          +5       │
│ ─────────────────────────────────── │
│ Total Vetting Score:       40       │
└─────────────────────────────────────┘

Admin Vetting Adjustment
[-10]----[0]----[+5]----[+10]
              ▲
```

### Auto-Suspension System

Vendors are automatically suspended when:
1. Score drops below **30**, AND
2. They have at least **3 reviews** (confidence threshold)

**What happens:**
- Vendor status changes to "Suspended"
- `suspended_at` timestamp recorded
- `suspension_reason` set to "Auto-suspended: Score dropped below threshold"
- Vendor no longer appears in matching results
- Vendor can still log in and see their dashboard

**Admin responsibilities:**
- Review auto-suspended vendors weekly
- Decide whether to:
  - Keep suspended (serious issues)
  - Reactivate with warning (borderline cases)
  - Permanently reject (repeated violations)

### Reactivating a Suspended Vendor

1. Go to vendor detail/edit
2. Review suspension reason and history
3. Check recent reviews and complaints
4. If appropriate, change status to "Active"
5. Consider adjusting vetting score if needed
6. Add admin note documenting the decision

---

## Vendor Applications

### Application Review Process

**URL**: `/applications`

New vendor applications appear here for review before vendors can receive matches.

### Application Queue

The queue shows:
- Business name
- Contact name
- Email
- Services requested
- Submission date
- Action buttons (View, Approve, Reject)

### Reviewing an Application

Click to view full application details:

**What to check:**
1. **Business legitimacy**: Does the business exist? Website check, Google search
2. **Contact information**: Valid email and phone?
3. **Service alignment**: Do their services match our needs?
4. **Coverage area**: Do they serve our target zip codes?
5. **Qualifications**: Licensed? Insured? Experience?
6. **Red flags**: Concerning language, unrealistic claims?

### Approval Checklist

Before approving, verify:

- [ ] Business name returns legitimate search results
- [ ] Phone number is valid (consider test call for high-value services)
- [ ] Email domain matches business (not generic gmail for established business)
- [ ] Services offered are within our supported categories
- [ ] Service areas include Philadelphia region zip codes
- [ ] No concerning reviews on external platforms (Google, Yelp, BBB)
- [ ] Qualifications seem reasonable for services offered

### Approving an Application

1. Click "Approve" button
2. Confirm the action
3. System will:
   - Change vendor status to "Active"
   - Calculate initial vetting score
   - Send welcome email to vendor
   - Vendor can now receive matches

### Rejecting an Application

1. Click "Reject" button
2. Select rejection reason (or write custom)
3. Confirm the action
4. System will:
   - Change vendor status to "Rejected"
   - Send rejection notification (if configured)
   - Application archived

**Common rejection reasons:**
- Outside service area
- Services not currently needed
- Insufficient qualifications
- Unable to verify business
- Policy concerns

### Requesting More Information

If application is incomplete:
1. Note what's missing in admin notes
2. Contact vendor directly via email/phone
3. Update application when information received
4. Then approve or reject

---

## Landlord Management

### Landlord Directory

**URL**: `/landlords`

View all landlords who have created accounts:

- Name and contact information
- Account creation date
- Number of requests submitted
- Last activity date

### Landlord Types

| Type | Description | Data Available |
|------|-------------|----------------|
| Registered | Created account | Full profile, dashboard access |
| Email-only | Submitted request without account | Email only, limited tracking |

### Viewing Landlord Details

Click on a landlord to see:
- Contact information
- All service requests (with status)
- Reviews they've submitted
- Account creation date

### Managing Landlord Issues

**Duplicate accounts:**
- Check for same email across accounts
- Merge request history if needed
- Contact landlord to consolidate

**Complaint handling:**
- Review their request history
- Check associated vendor reviews
- Document in admin notes
- Escalate if serious

---

## Matching Vendors to Requests

### The Matching Process

1. Open a request with status "New" or "Matching"
2. Click "Match Vendors" button
3. System displays eligible vendors
4. Review and select vendors (up to 3)
5. Confirm to send introduction emails

### Vendor Selection Interface

The matching modal shows vendors filtered by:
- Service type matches request
- Service area includes property location
- Status is "Active"

**For each vendor, you'll see:**
- Business name and contact
- Services (relevant ones highlighted)
- Service areas
- **Tier badge** (Excellent/Good/Average/etc.)
- Rating and review count
- Checkbox to select

### Reading Tier Badges

| Badge | Meaning | Recommendation |
|-------|---------|----------------|
| ⭐ Excellent (Green) | Top performer | Always a great choice |
| Good (Blue) | Solid performer | Reliable choice |
| Average (Orange) | Acceptable | Use when better options unavailable |
| ⚠️ Below Average (Red) | Concerns | Avoid unless necessary, monitor closely |
| New (Gray) | Unreviewed | Acceptable for trying new vendors |

### Matching Best Practices

**Standard matching:**
- Select 2-3 vendors per request
- Prioritize "Excellent" and "Good" tier vendors
- Include variety if possible (different price points)

**Emergency requests:**
- Prioritize vendors known for quick response
- Consider calling vendors directly
- May match more than 3 if urgency warrants

**Specialty requests:**
- Focus on vendors with specific qualifications
- Check admin notes for relevant experience
- May need to go outside typical tier preferences

### After Matching

Once you confirm the match:
1. Status changes to "Matched"
2. Introduction emails sent to landlord and vendors
3. System tracks vendor response times
4. Follow-up triggered after configured period

### Monitoring Matched Requests

Check back on matched requests to:
- Verify vendors responded
- Track if job was completed
- Prompt landlord for review
- Handle any issues that arise

---

## Analytics & Reporting

### Analytics Dashboard

**URL**: `/analytics`

### Key Metrics

**Request Metrics:**
- Total requests (by period)
- Requests by service type
- Requests by status
- Average time to match
- Request volume trends

**Vendor Metrics:**
- Active vendor count
- Vendors by service type
- Average vendor score
- Score distribution
- Top performers

**Matching Metrics:**
- Match success rate
- Vendors per request average
- Response rate
- Completion rate

**Review Metrics:**
- Reviews submitted
- Average rating
- Rating distribution
- Review completion rate

### Using Analytics

**Weekly review:**
- Check pending request backlog
- Identify service type gaps
- Monitor vendor performance trends

**Monthly review:**
- Analyze request volume trends
- Review vendor tier distribution
- Identify top and struggling vendors
- Plan vendor recruitment if needed

**Quarterly review:**
- Deep dive on match success
- Review auto-suspension effectiveness
- Assess scoring algorithm performance
- Recommend threshold adjustments

---

## System Configuration

### Scoring Thresholds

Current configuration (code-defined):

| Setting | Value | Location |
|---------|-------|----------|
| Auto-suspend threshold | 30 | `src/lib/scoring/config.ts` |
| Min reviews before suspend | 3 | `src/lib/scoring/config.ts` |
| Review decay period | 180 days | `src/lib/scoring/config.ts` |
| Min reviews for full confidence | 5 | `src/lib/scoring/config.ts` |

### Response Time Thresholds

| Rating | Hours |
|--------|-------|
| Excellent | < 4 |
| Good | 4-12 |
| Average | 12-24 |
| Below Average | 24-48 |
| Poor | > 48 |

### Email Templates

Automated emails are sent for:
- Vendor application received
- Vendor approved/rejected
- Match introduction (to landlord)
- Match introduction (to vendor)
- Follow-up request
- Review request

*Contact development team to modify email templates.*

---

## Troubleshooting

### Common Issues

#### Vendor not appearing in matches

**Check:**
1. Is vendor status "Active"?
2. Does vendor's service list include the request's service type?
3. Does vendor's service area include the property zip code?
4. Is vendor suspended?

**Fix:**
- Update vendor status if incorrectly set
- Add missing services or service areas
- Reactivate if suspension was error

#### Vetting score not calculating

**Check:**
1. Is years_in_business set?
2. Has vendor been saved since adding years?

**Fix:**
- Set years_in_business field
- Save vendor to trigger recalculation

#### Score seems incorrect

**Check:**
1. Review the score breakdown in logs
2. Check for recent reviews affecting score
3. Verify penalties are appropriate

**Fix:**
- Review usually resolves once understood
- Adjust admin vetting adjustment if warranted
- Report to dev team if calculation seems wrong

#### Vendor auto-suspended unexpectedly

**Check:**
1. What's their current score?
2. How many reviews do they have?
3. Were there recent bad reviews?

**Fix:**
- Review recent review history
- If suspension seems unfair, reactivate and adjust score
- If warranted, keep suspended and follow up with vendor

#### Landlord can't see their requests

**Check:**
1. Are they logged in to correct account?
2. Were requests submitted with different email?
3. Is there a duplicate account issue?

**Fix:**
- Verify email addresses match
- Help them log in to correct account
- Consider account merge if needed

### Error Messages

| Error | Meaning | Resolution |
|-------|---------|------------|
| "Vendor not found" | ID doesn't exist | Check vendor was created properly |
| "Match not found" | Match ID invalid | Verify match exists in database |
| "Unauthorized" | Permission issue | Check user is logged in as admin |
| "Failed to update" | Database error | Retry, check logs, contact dev |

### When to Escalate

Contact the development team when:
- Scoring calculations appear incorrect
- System errors persist after retry
- Data inconsistencies found
- Feature requests or improvements needed
- Security concerns

---

## Best Practices

### Daily Operations

1. **Morning routine:**
   - Check pending requests queue
   - Review any new applications
   - Process overnight submissions

2. **Throughout the day:**
   - Match new requests within 4 hours
   - Respond to landlord inquiries promptly
   - Note any vendor issues encountered

3. **End of day:**
   - Ensure no urgent requests pending
   - Clear application backlog
   - Note any items for follow-up

### Vendor Quality Management

1. **Proactive monitoring:**
   - Review vendors dropping toward suspension threshold
   - Check for patterns in negative reviews
   - Follow up with struggling vendors before they fail

2. **Feedback loop:**
   - Share positive reviews with vendors
   - Address negative feedback constructively
   - Document all vendor communications

3. **Network health:**
   - Maintain minimum vendor coverage per service type
   - Recruit when gaps identified
   - Retire consistently poor performers

### Matching Quality

1. **Prioritize quality:**
   - Excellent/Good vendors first
   - Use Average tier sparingly
   - Avoid Below Average except emergencies

2. **Consider context:**
   - Job complexity
   - Landlord history and preferences
   - Urgency level
   - Budget indicators

3. **Document decisions:**
   - Add admin notes on unusual matches
   - Track outcomes for learning
   - Adjust approach based on results

### Data Hygiene

1. **Keep information current:**
- Update vendor info when notified of changes
   - Remove outdated service areas
   - Correct contact information errors

2. **Regular audits:**
   - Monthly review of inactive vendors
   - Quarterly review of service area coverage
   - Annual vendor re-verification

---

## Glossary

| Term | Definition |
|------|------------|
| **Active Vendor** | Vendor in good standing, eligible for matches |
| **Admin Adjustment** | Manual ±10 point modifier to vetting score |
| **Auto-Suspension** | System automatically suspends vendors below score threshold |
| **Confidence Dampening** | New vendors' scores pulled toward 50 until enough reviews |
| **Intro Email** | Automated email connecting landlord with matched vendors |
| **Match** | Assignment of a vendor to a service request |
| **Performance Score** | Vendor's overall score (0-100) used for ranking |
| **Service Area** | Zip codes where a vendor is willing to work |
| **Tier** | Category (Excellent/Good/Average/etc.) based on score |
| **Vetting Score** | Initial score based on credentials (max 45) |

---

## Appendix: Quick Reference

### Keyboard Shortcuts

*Currently not implemented - future enhancement*

### Status Cheat Sheet

**Request Status:**
- New → Matching → Matched → Completed

**Vendor Status:**
- Pending Review → Active ↔ Inactive
- Active → Suspended (manual or auto)
- Pending Review → Rejected

### Contact Information

**Technical Support:**
- Development Team: [internal contact]
- System Issues: [internal contact]

**Business Questions:**
- Platform Manager: [internal contact]
- Vendor Relations: [internal contact]

---

*Last Updated: December 2024*
*Version: 1.0*
