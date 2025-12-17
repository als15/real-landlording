# Vendor Scoring System Demo Guide

## Overview

The Vendor Scoring System is a comprehensive solution for evaluating and ranking vendors in the Real Landlording platform. It replaces the previous simple rating display with a dynamic, multi-factor scoring algorithm that ensures landlords are matched with the best vendors while incentivizing vendors to maintain high service standards.

### Key Features

- **Multi-dimensional Reviews**: Landlords rate vendors on Quality, Price, Timeliness, and Professionalism
- **Initial Vetting Score**: New vendors start with a score based on credentials (license, insurance, experience)
- **Response Time Tracking**: Vendors are rewarded for quick responses to job requests
- **Tier-Based Matching**: Vendors are categorized into tiers that affect their visibility in matches
- **Auto-Suspension**: Consistently poor performers are automatically suspended from receiving new leads
- **Admin Controls**: Manual adjustments and oversight capabilities

---

## Score Calculation Formula

The vendor score (0-100) is calculated using weighted components:

| Component | Weight | Description |
|-----------|--------|-------------|
| Review Score | 35% | Weighted average of landlord reviews (recent reviews count more) |
| Completion Rate | 20% | Percentage of accepted jobs completed successfully |
| Response Time | 15% | Average time to respond to job requests |
| Vetting Score | 10% | Initial credentials (license, insurance, years in business) |
| Acceptance Rate | 10% | Percentage of matched jobs accepted |
| Volume Bonus | 5% | Bonus for completing many jobs |
| Recency Bonus | 5% | Bonus for recent platform activity |

**Penalties are applied for:**
- No-shows: -5 points each
- Declining after accepting: -3 points each
- 1-star reviews: -2 points each (additional penalty)

---

## Vendor Tiers

| Tier | Score Range | Color | Lead Priority |
|------|-------------|-------|---------------|
| Excellent | 80-100 | Green | Priority access to all leads |
| Good | 60-79 | Blue | Standard lead access |
| Average | 40-59 | Orange | Conditional access (may need admin approval) |
| Below Average | 20-39 | Red | Limited leads, review required |
| Poor | 0-19 | Gray | Auto-suspended from new leads |
| New | 50 (default) | Default | Standard access until reviewed |

---

## Demo Walkthrough

### Part 1: Landlord Perspective

#### 1.1 Submitting a Service Request

**URL**: `/request`

1. Landlord visits the request form (no login required)
2. Fills out service details:
   - Service type (Plumber, Electrician, HVAC, etc.)
   - Property location
   - Job description
   - Urgency level
3. Submits request
4. Optionally creates an account to track the request

**Demo Script:**
> "When a landlord submits a request, our system automatically begins matching them with appropriate vendors based on service type, location, and vendor scores."

#### 1.2 Viewing Matched Vendors

**URL**: `/dashboard`

1. Landlord logs in to their dashboard
2. Views list of their service requests
3. Clicks "View Details" on a request
4. Sees matched vendors with:
   - Business name and contact info
   - Option to leave a review (if job completed)

**Demo Script:**
> "The landlord can see which vendors have been matched to their request. Once the job is complete, they can leave a detailed review."

#### 1.3 Leaving a Multi-Dimensional Review

**URL**: `/dashboard` → View Details → Leave Review

1. Click "Leave Review" button on a matched vendor
2. Review modal opens with:
   - **Overall Rating** (required): 1-5 stars
   - **Quality of Work** (optional): 1-5 stars
   - **Price / Value** (optional): 1-5 stars
   - **Timeliness** (optional): 1-5 stars
   - **Professionalism** (optional): 1-5 stars
   - **Additional Comments** (optional): Free text

**Demo Script:**
> "Our new multi-dimensional review system lets landlords provide granular feedback. The overall rating is required, but they can optionally rate specific aspects like quality, price, timeliness, and professionalism. This gives us much richer data to calculate vendor scores."

**Key Points to Highlight:**
- Dimension ratings are optional to reduce friction
- When dimensions are provided, they're averaged with the overall rating for a more accurate score
- Recent reviews are weighted more heavily than older ones (reviews decay over 180 days)

---

### Part 2: Vendor Perspective

#### 2.1 Applying as a Vendor

**URL**: `/vendor/apply`

1. Vendor fills out application form:
   - Contact information (name, business name, email, phone)
   - Services offered (multi-select from predefined list)
   - Service areas (zip codes)
   - Business address
   - **Years in Business** (new field - affects vetting score)
   - Checkboxes: Licensed, Insured, Rental Experience
   - Qualifications description
   - Terms acceptance

**Demo Script:**
> "When a vendor applies, we collect information that directly impacts their initial vetting score. Being licensed adds 15 points, having insurance adds 10 points, and years in business can add up to 10 more points. This gives established, credentialed vendors a head start."

**Vetting Score Calculation:**
| Factor | Points |
|--------|--------|
| Licensed | +15 |
| Insured | +10 |
| Years in Business | 0-10 (scales with experience) |
| Admin Adjustment | ±10 |
| **Maximum Total** | **45** |

#### 2.2 Vendor Dashboard

**URL**: `/vendor/dashboard`

1. Vendor logs in after approval
2. Dashboard shows:
   - Performance metrics
   - Incoming job requests
   - Review history and ratings

**Demo Script:**
> "Vendors can monitor their performance and see incoming job opportunities. Their response time to these opportunities directly affects their score."

#### 2.3 How Scores Affect Vendors

**Response Time Scoring:**
| Response Time | Score |
|---------------|-------|
| Under 4 hours | 100 (Excellent) |
| 4-12 hours | 75-100 (Good) |
| 12-24 hours | 50-75 (Average) |
| 24-48 hours | 25-50 (Below Average) |
| Over 48 hours | 0-25 (Poor) |

**Demo Script:**
> "We track how quickly vendors respond to job requests. Responding within 4 hours gives them maximum points for the response time component. This incentivizes quick, professional responses."

---

### Part 3: Admin Perspective

#### 3.1 Viewing Vendor List with Scores

**URL**: `/vendors` (admin area)

1. Navigate to Vendors page
2. View list showing:
   - Business name and contact
   - Services offered
   - Current rating and review count
   - Status (Active, Pending, etc.)

**Demo Script:**
> "The admin dashboard gives us a complete view of all vendors. We can filter by status, search by name, and quickly see each vendor's performance."

#### 3.2 Vendor Details & Vetting Score

**URL**: `/vendors` → Click eye icon on any vendor

1. Open vendor drawer
2. View comprehensive details including new **Vetting Score** section:
   - Years in Business
   - Base Score (auto-calculated)
   - Admin Adjustment
   - Total Vetting Score

**Demo Script:**
> "In the vendor details, we now have a dedicated Vetting Score section. This shows the auto-calculated score based on their credentials, plus any admin adjustment we've applied."

#### 3.3 Editing Vendor & Admin Vetting Adjustment

**URL**: `/vendors` → Click edit icon on any vendor

1. Open edit modal
2. Scroll to **Vetting Score** section
3. View:
   - Current vetting score breakdown
   - Slider for Admin Adjustment (-10 to +10)

**Demo Script:**
> "The admin adjustment slider lets us manually tweak a vendor's vetting score by up to 10 points in either direction. This is useful for:
> - Rewarding vendors with exceptional portfolios we've reviewed
> - Penalizing vendors with concerning background checks
> - Adjusting for factors our automated system can't capture"

**Key Points to Highlight:**
- Adjustment is transparent (shown separately from base score)
- Maximum total vetting score is capped at 45
- Changes take effect immediately in matching

#### 3.4 Matching Vendors to Requests

**URL**: `/requests` → Select a request → Match Vendors

1. Open a service request
2. Click "Match Vendors" button
3. View vendor list with **new tier badges**:
   - Green "Excellent" badge with star icon for top vendors
   - Blue "Good" badge for solid performers
   - Orange "Average" badge for middle-tier
   - Red warning for below average
   - "New" badge for unreviewed vendors

**Demo Script:**
> "When matching vendors to a request, admins now see tier badges next to each vendor. Green badges indicate our highest-rated vendors - these should be prioritized. Red or orange badges suggest caution, and 'New' badges indicate vendors who haven't been reviewed yet."

**Visual Indicators:**
- Recommended vendors get a star icon
- Warning vendors get an alert icon
- Badges are color-coded for quick scanning

#### 3.5 Auto-Suspension System

**How It Works:**
1. After each review, the vendor's score is recalculated
2. If score drops below 30 AND vendor has 3+ reviews:
   - Vendor is automatically suspended
   - `suspended_at` timestamp is recorded
   - `suspension_reason` is set to "Auto-suspended: Score dropped below threshold"
3. Suspended vendors no longer appear in matching results

**Demo Script:**
> "The auto-suspension system protects landlords from consistently poor performers. Once a vendor drops below a score of 30 and has at least 3 reviews (so we have enough data), they're automatically suspended from receiving new leads. This ensures quality without requiring constant admin monitoring."

**Admin Override:**
- Admins can manually reactivate suspended vendors
- Can view suspension history and reason
- Can adjust scores to prevent suspension if warranted

---

## Technical Architecture

### Database Schema Changes

```sql
-- New vendor fields
years_in_business INTEGER
vetting_score INTEGER
vetting_admin_adjustment INTEGER DEFAULT 0
suspended_at TIMESTAMP
suspension_reason TEXT

-- New match tracking
status match_status ENUM (pending, intro_sent, vendor_accepted,
                          vendor_declined, no_response, in_progress,
                          completed, cancelled, no_show)
response_time_seconds INTEGER
declined_after_accept BOOLEAN

-- Multi-dimensional reviews
review_quality INTEGER (1-5)
review_price INTEGER (1-5)
review_timeline INTEGER (1-5)
review_treatment INTEGER (1-5)
```

### Score Calculation Flow

```
1. Landlord submits review
   ↓
2. API saves review with dimensions
   ↓
3. Vendor score recalculated
   ↓
4. Check auto-suspend threshold
   ↓
5. Update vendor record
   ↓
6. New score reflected in matching
```

---

## Demo Scenarios

### Scenario 1: New Vendor Onboarding
1. Vendor applies with: Licensed ✓, Insured ✓, 5+ years experience
2. System calculates vetting score: 15 + 10 + 10 = 35 points
3. Admin reviews, adds +5 adjustment for excellent portfolio
4. Total vetting score: 40/45
5. Vendor starts with base score of 50, boosted by vetting component

### Scenario 2: Excellent Vendor Performance
1. Vendor responds to jobs within 2 hours (Response: 100)
2. Completes all accepted jobs (Completion: 100)
3. Receives 5-star reviews with high dimension scores
4. Score climbs to 85+ → "Excellent" tier
5. Gets priority placement in matching

### Scenario 3: Declining Performance
1. Vendor starts missing response windows
2. Has two no-shows (-10 points penalty)
3. Receives multiple 2-star reviews
4. Score drops to 28 (below 30 threshold)
5. Has 4 reviews (above minimum of 3)
6. System auto-suspends vendor
7. Admin notified, can review and decide next steps

### Scenario 4: Multi-Dimensional Review Impact
1. Vendor receives overall 4-star rating
2. Landlord also rates: Quality 5, Price 3, Timeline 4, Professionalism 5
3. System calculates effective rating: (4 + 5 + 3 + 4 + 5) / 5 = 4.2
4. More accurate score than simple 4-star would provide

---

## Benefits Summary

### For Landlords
- More reliable vendor matches
- Granular review options
- Bad vendors automatically filtered out

### For Vendors
- Clear path to improve standing
- Rewarded for responsiveness
- Credentials valued from day one

### For Admins
- Less manual oversight needed
- Data-driven matching decisions
- Transparent scoring system
- Override capabilities when needed

---

## Q&A Preparation

**Q: What happens to existing vendors without vetting scores?**
A: They continue with their current performance scores. Vetting scores can be backfilled by updating their profile with years in business.

**Q: Can a suspended vendor be reactivated?**
A: Yes, admins can manually change their status back to active and optionally adjust their score.

**Q: How quickly do score changes take effect?**
A: Immediately. Score recalculation happens synchronously when reviews are submitted.

**Q: What if a landlord only provides the overall rating?**
A: That works fine. Dimension ratings are optional and only factor in when provided.

**Q: How is the confidence factor calculated?**
A: Vendors with fewer than 5 reviews have their score dampened toward 50. This prevents a single review from causing extreme scores.

---

## Next Steps

1. **Run Migration**: Apply `004_vendor_scoring_enhancement.sql` to production
2. **Backfill Data**: Update existing vendors with years_in_business where known
3. **Monitor**: Watch for edge cases and adjust thresholds if needed
4. **Iterate**: Gather feedback and refine weights/thresholds based on real data
