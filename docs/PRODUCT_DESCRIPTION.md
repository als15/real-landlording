# Real Landlording Platform
## Product Description Document

**Version:** 1.0
**Last Updated:** February 2026
**Document Owner:** Product Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Mission](#product-vision--mission)
3. [Market Context & Problem Statement](#market-context--problem-statement)
4. [Target Users](#target-users)
5. [Core Value Proposition](#core-value-proposition)
6. [Platform Architecture Overview](#platform-architecture-overview)
7. [Feature Specifications](#feature-specifications)
8. [User Journeys](#user-journeys)
9. [Service Categories](#service-categories)
10. [Data Model](#data-model)
11. [Smart Matching System](#smart-matching-system)
12. [Communication System](#communication-system)
13. [Analytics & Reporting](#analytics--reporting)
14. [Security & Compliance](#security--compliance)
15. [Integration Ecosystem](#integration-ecosystem)
16. [Product Roadmap](#product-roadmap)
17. [Success Metrics & KPIs](#success-metrics--kpis)
18. [Glossary](#glossary)

---

## Executive Summary

Real Landlording is a B2B marketplace platform that connects Philadelphia-area landlords with vetted service vendors. The platform facilitates the entire lifecycle from service request submission through vendor matching, introduction, job completion, and review collection.

**Key Statistics (Pre-Platform):**
- 800+ referral requests processed manually
- $60,000+ in revenue generated
- 2,900+ engaged landlords in the community

**The Challenge:** Manual processing of every request created an operational bottleneck that prevented scaling while maintaining quality.

**The Solution:** An intelligent platform that automates vendor-landlord matching while preserving the trust and quality standards that built the community.

**Technology Stack:**
- Frontend: Next.js 16 (React 19) with Ant Design
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Email: Resend
- SMS: Twilio
- Contracts: PandaDoc
- Hosting: Vercel + Supabase Cloud

---

## Product Vision & Mission

### Vision
To become the definitive platform for connecting Philadelphia landlords with reliable, vetted service providers—eliminating the uncertainty and risk from property maintenance and improvement decisions.

### Mission
Empower landlords to maintain and improve their properties efficiently by providing instant access to pre-vetted, rental-experienced vendors matched intelligently to their specific needs.

### Core Principles

1. **Trust First:** Every vendor is vetted for quality, licensing, insurance, and rental property experience
2. **Landlord-Centric:** Designed around the unique challenges of managing rental properties
3. **Intelligent Matching:** Multi-factor algorithms ensure optimal vendor-request pairings
4. **Operational Excellence:** Automated workflows reduce manual overhead while maintaining quality
5. **Continuous Improvement:** Feedback loops and performance tracking drive ongoing optimization

---

## Market Context & Problem Statement

### The Landlord's Challenge

Small to mid-size landlords face significant challenges when seeking reliable service providers:

| Challenge | Impact |
|-----------|--------|
| **Finding qualified vendors** | Hours spent researching, calling, and vetting |
| **Rental property expertise** | Many contractors avoid or don't understand rental needs |
| **Urgency mismatch** | Emergency repairs require fast, reliable response |
| **Quality uncertainty** | No way to verify track record with similar properties |
| **Geographic coverage** | Vendors may not service specific neighborhoods |
| **Budget alignment** | Difficulty finding vendors within budget constraints |

### The Vendor's Challenge

Quality service providers struggle to find qualified leads:

| Challenge | Impact |
|-----------|--------|
| **Marketing costs** | High customer acquisition costs |
| **Lead quality** | Time wasted on unqualified or uncommitted leads |
| **Rental market access** | Difficulty reaching property investor community |
| **Trust building** | No platform to showcase rental-specific expertise |

### Our Solution

Real Landlording serves as a **trusted intermediary** that:
- Pre-vets vendors for quality, licensing, and rental experience
- Collects detailed request information upfront
- Uses intelligent matching to pair requests with optimal vendors
- Facilitates introductions and tracks outcomes
- Builds performance data through reviews and feedback

---

## Target Users

### Primary: Landlords

**Demographics:**
- Small to mid-size landlords in Philadelphia metropolitan area
- Typically manage 1-20 units (some manage 100+)
- Mix of individual investors and small property management companies

**Behavioral Characteristics:**
- Value reliability over lowest price
- Need vendors who understand tenant-occupied properties
- Often manage multiple properties across different neighborhoods
- Require both routine maintenance and emergency response

**Pain Points:**
- Time-consuming vendor search and vetting
- Inconsistent service quality
- Poor communication from vendors
- Difficulty finding specialists for rental-specific needs

### Secondary: Vendors

**Profile:**
- Licensed and insured service providers
- Experience working with rental properties
- Service Philadelphia and surrounding areas
- Willing to pay referral fees for qualified leads

**Vendor Categories (35 service types across 5 groups):**
1. Fix It / Build It (13 categories)
2. Property Care & Maintenance (7 categories)
3. Compliance & Testing (6 categories)
4. Professional & Financial (6 categories)
5. Creative & Knowledge (3 categories)

**Motivations:**
- Access to pre-qualified leads
- Reduced marketing spend
- Opportunity to build reputation in rental market
- Steady pipeline of appropriate job opportunities

### Tertiary: Administrators

**Profile:**
- Real Landlording team members
- Responsible for vendor vetting and platform operations
- Handle edge cases and maintain quality standards

**Needs:**
- Efficient request processing workflows
- Vendor performance visibility
- Override capabilities for complex situations
- Analytics for business decision-making

---

## Core Value Proposition

### For Landlords

| Value | Description |
|-------|-------------|
| **Vetted Vendors** | Every vendor verified for licensing, insurance, and rental experience |
| **Smart Matching** | AI-assisted matching based on service type, location, urgency, budget, and vendor performance |
| **Zero Cost** | Free for landlords—no subscription or per-request fees |
| **Multiple Options** | Up to 3 matched vendors per request for comparison |
| **Track Record** | Access to vendor reviews and performance ratings |
| **Easy Submission** | No account required to submit requests |
| **Full Transparency** | Track request status from submission to completion |

### For Vendors

| Value | Description |
|-------|-------------|
| **Qualified Leads** | Every lead includes detailed job information and landlord contact |
| **Targeted Matching** | Only receive leads matching your services, areas, and capabilities |
| **Performance Visibility** | Build reputation through reviews and ratings |
| **Professional Platform** | Dashboard for managing opportunities and tracking performance |
| **Fair Competition** | Maximum 3 vendors per request ensures real opportunity |
| **Growth Opportunity** | Access to 2,900+ landlord community |

---

## Platform Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PUBLIC INTERFACES                            │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│  Request Form   │ Vendor Apply    │   Authentication Pages          │
│  (No login)     │ (5-step wizard) │   (Login/Signup/Reset)          │
└────────┬────────┴────────┬────────┴────────────────┬────────────────┘
         │                 │                          │
         ▼                 ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATED PORTALS                        │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│  Landlord       │  Vendor         │   Admin Dashboard               │
│  Dashboard      │  Dashboard      │   (Full platform control)       │
│  - My Requests  │  - Job Queue    │   - Request Management          │
│  - Reviews      │  - Stats        │   - Vendor Management           │
│  - Profile      │  - Profile      │   - Applications                │
│                 │                 │   - Landlords                   │
│                 │                 │   - Analytics                   │
└────────┬────────┴────────┬────────┴────────────────┬────────────────┘
         │                 │                          │
         ▼                 ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                   │
│  Next.js API Routes with Supabase Admin Client                      │
│  - Request APIs    - Vendor APIs    - Admin APIs    - Webhooks      │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA & SERVICES                              │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│  Supabase       │  Resend         │   Twilio          │  PandaDoc   │
│  - PostgreSQL   │  - Emails       │   - SMS           │  - Contracts│
│  - Auth         │  - Templates    │   - Notifications │  - SLAs     │
│  - Storage      │                 │                   │             │
└─────────────────┴─────────────────┴───────────────────┴─────────────┘
```

### Technology Decisions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 16 + React 19 | Server components, excellent DX, Vercel integration |
| **UI Library** | Ant Design | Enterprise-grade components, comprehensive admin features |
| **Backend** | Next.js API Routes | Unified codebase, serverless deployment |
| **Database** | Supabase (PostgreSQL) | Relational data, RLS security, real-time capabilities |
| **Auth** | Supabase Auth | Built-in, secure, handles all auth flows |
| **Email** | Resend | Modern API, excellent deliverability, email history |
| **SMS** | Twilio | Industry standard, reliable delivery |
| **Contracts** | PandaDoc | Simple API, lower cost than alternatives |
| **Hosting** | Vercel | Automatic deployments, edge network, analytics |

---

## Feature Specifications

### 7.1 Service Request System

#### Request Submission Form

**Multi-Step Process:**

| Step | Fields | Purpose |
|------|--------|---------|
| 1. Service Selection | Category, sub-categories, classifications | Identify exact service needed |
| 2. Property Details | Address, type, units, occupancy | Understand property context |
| 3. Job Details | Description, urgency, budget, finish level | Define scope and constraints |
| 4. Media Upload | Photos/videos (up to 5, 10MB each) | Visual context for vendors |
| 5. Contact Info | Name, email, phone, preference | Enable vendor contact |
| 6. Review & Submit | Summary, terms acceptance | Confirm accuracy |

**Key Capabilities:**
- No login required for submission
- Address autocomplete with validation
- Dynamic sub-category options based on service type
- Support for JPEG, PNG, WebP, HEIC images and MP4, MOV videos
- Real-time form validation
- Terms acceptance with timestamp tracking

**Post-Submission Flow:**
1. Landlord receives confirmation email and SMS
2. Request enters admin queue as "New"
3. Account creation nudge displayed (optional)
4. Graduated nudge on 2nd request from same email

#### Request Status Lifecycle

```
NEW → MATCHING → MATCHED → COMPLETED
                    ↓
               CANCELLED
```

| Status | Description | Trigger |
|--------|-------------|---------|
| **New** | Request received, pending review | Form submission |
| **Matching** | Admin reviewing, selecting vendors | Admin opens request |
| **Matched** | Vendors selected, intros sent | Admin completes matching |
| **Completed** | Job finished, feedback collected | Landlord confirms completion |
| **Cancelled** | Request withdrawn or invalid | Admin or landlord action |

### 7.2 Vendor Management System

#### Vendor Onboarding Paths

**Path A: Admin Invitation**
```
Admin creates vendor profile
    ↓
System sends invite email
    ↓
Vendor confirms details
    ↓
Admin sends SLA document
    ↓
Vendor signs SLA
    ↓
Vendor goes ACTIVE
```

**Path B: Self-Application**
```
Vendor completes 5-step application
    ↓
Application enters review queue
    ↓
Admin reviews and decides
    ↓ (Approved)         ↓ (Rejected)
SLA sent to vendor    Rejection email sent
    ↓
Vendor signs SLA
    ↓
Vendor goes ACTIVE
```

#### Vendor Application Form

| Step | Information Collected |
|------|----------------------|
| 1. Contact | Name, email, phone, business name, website |
| 2. Services | Primary services (multi-select), sub-categories, specializations |
| 3. Experience | Years in business, licensed, insured, rental experience, qualifications |
| 4. Business | Location, service areas (zip codes), employee count, emergency capability, job size range, payment methods, service hours |
| 5. Review | Summary, terms acceptance, submission |

#### Vendor Profile Data Model

| Category | Fields |
|----------|--------|
| **Identity** | Contact name, business name, website, social links |
| **Services** | Service categories, specializations, equipment |
| **Credentials** | Licensed, insured, years in business, qualifications |
| **Coverage** | Service areas (zip codes), emergency availability |
| **Capacity** | Employee count, job size range, service hours |
| **Performance** | Rating (0-5), review count, response time, acceptance rate |
| **Status** | Active, Inactive, Pending Review, Rejected |
| **Contract** | SLA status, signed date, document URL |

#### Vendor Status Definitions

| Status | Description | Visibility |
|--------|-------------|------------|
| **Active** | Verified, SLA signed, receiving leads | Visible in matching |
| **Inactive** | Temporarily unavailable | Hidden from matching |
| **Pending Review** | Application submitted, awaiting review | Hidden from matching |
| **Rejected** | Application declined | Hidden from matching |

### 7.3 Landlord Portal

#### Dashboard Features

| Feature | Description |
|---------|-------------|
| **Request History** | All submitted requests with status tracking |
| **Match Details** | View matched vendors for each request |
| **Vendor Profiles** | Access vendor contact info and credentials |
| **Review Submission** | Rate vendors after job completion |
| **Profile Management** | Update contact info and preferences |

#### Review System

**Rating Dimensions:**
| Dimension | Description |
|-----------|-------------|
| **Overall** | General satisfaction (1-5 stars) |
| **Quality** | Workmanship and results |
| **Price** | Value for money |
| **Timeline** | Punctuality and speed |
| **Treatment** | Professionalism and communication |

**Review Impact:**
- Contributes to vendor performance score
- Visible to admin for quality monitoring
- Influences future matching recommendations

### 7.4 Vendor Portal

#### Dashboard Features

| Feature | Description |
|---------|-------------|
| **Job Queue** | Matched opportunities with landlord details |
| **Job Actions** | Accept, view details, mark complete |
| **Performance Stats** | Total jobs, pending, completed, average rating |
| **Profile Management** | Update business info and services |

#### Job Status Flow

```
PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
    ↓         ↓
  DECLINED  DECLINED_AFTER_ACCEPT
```

### 7.5 Admin Dashboard

#### Module Overview

| Module | Purpose | Key Actions |
|--------|---------|-------------|
| **Dashboard** | Overview metrics | View stats, recent activity |
| **Requests** | Request management | View, match, resend intros, export |
| **Vendors** | Vendor management | Add, edit, change status, send SLA |
| **Applications** | Application review | Approve, reject, edit, delete |
| **Landlords** | Landlord directory | View profiles, request history |
| **Analytics** | Performance metrics | View trends, leaderboards |
| **Emails** | Communication history | Search sent emails |

#### Request Management Features

| Feature | Description |
|---------|-------------|
| **Request Queue** | Filterable list of all requests |
| **Quick View** | Drawer with full request details |
| **Smart Matching** | AI-suggested vendors with scores |
| **Manual Selection** | Override to choose any active vendor |
| **Intro Emails** | Send/resend introduction emails |
| **Status Updates** | Change request status |
| **Notes** | Internal admin notes |
| **Export** | CSV download of requests |

#### Vendor Management Features

| Feature | Description |
|---------|-------------|
| **Vendor Directory** | Searchable, filterable vendor list |
| **Add Vendor** | Create new vendor profile |
| **Edit Vendor** | Modify all vendor details |
| **Status Control** | Activate, deactivate, reject |
| **Match History** | View vendor's past matches |
| **Reviews** | See all vendor reviews |
| **SLA Management** | Send, resend, track SLA status |
| **Admin Notes** | Internal comments |
| **Export** | CSV download of vendors |

---

## User Journeys

### 8.1 Landlord Journey: Emergency Plumber Needed

**Scenario:** A landlord has a burst pipe in a tenant-occupied unit and needs emergency help.

```
1. DISCOVER
   Landlord visits reallandlording.com
   Clicks "Get a Vendor" button

2. SUBMIT REQUEST
   Selects "Plumber / Sewer" category
   Chooses "Leak" sub-category
   Enters property address (auto-complete)
   Selects "Row Home" property type
   Enters "Occupied" status
   Sets urgency to "Emergency"
   Describes: "Burst pipe under kitchen sink, water actively leaking"
   Uploads photo of the leak
   Enters contact info with "Phone" preference
   Accepts terms and submits

3. CONFIRMATION
   Sees confirmation screen
   Receives confirmation email and SMS
   Optional: Creates account to track request

4. MATCHING (within hours for emergency)
   Admin receives notification
   Opens request, reviews details
   Smart system suggests 3 plumbers:
     - Vendor A: 89 score (24/7 service, 4.8 rating, serves zip code)
     - Vendor B: 82 score (emergency capable, 4.6 rating)
     - Vendor C: 75 score (serves area, good reviews)
   Admin confirms suggestions
   System sends intro emails to landlord and all 3 vendors

5. VENDOR CONTACT
   Landlord receives email with:
     - Vendor names and businesses
     - Phone numbers and emails
     - Service highlights
   Vendors receive email with:
     - Property address and details
     - Job description and urgency
     - Landlord contact info
     - Photos attached

6. JOB COMPLETION
   Landlord contacts vendors directly
   Selects and schedules with Vendor A
   Pipe repaired same day

7. FEEDBACK
   3 days later: Follow-up email asks "How did it go?"
   Landlord clicks link to submit review
   Rates Vendor A: 5 stars overall
     - Quality: 5, Price: 4, Timeline: 5, Treatment: 5
   Writes: "Fast response, professional work, fair price"

8. IMPACT
   Vendor A's performance score updates
   Review visible in admin dashboard
   Vendor A ranks higher in future emergency matches
```

### 8.2 Vendor Journey: Joining the Platform

**Scenario:** An HVAC company wants to receive leads from Real Landlording.

```
1. DISCOVER
   Vendor hears about platform from landlord client
   Visits reallandlording.com/vendor/apply

2. APPLICATION (5 steps)
   Step 1 - Contact:
     - Business: "Philly Climate Control LLC"
     - Contact: "John Smith"
     - Email, phone, website

   Step 2 - Services:
     - Primary: "HVAC"
     - Sub-services: Installation, Repair, Maintenance
     - Equipment: Central AC, Mini-splits, Furnaces

   Step 3 - Experience:
     - Years in business: 12
     - Licensed: Yes
     - Insured: Yes
     - Rental experience: Yes
     - Qualifications: EPA certified, NATE certified

   Step 4 - Business Details:
     - Location: Philadelphia, PA
     - Service areas: 19103, 19104, 19106... (15 zip codes)
     - Employees: 5-10
     - Emergency service: Yes (24/7)
     - Job sizes: $500-$25,000
     - Payment: Check, card, financing
     - Hours: Weekdays 7-6, Weekends 8-4, Emergency 24/7

   Step 5 - Review:
     - Reviews all info
     - Accepts terms and conditions
     - Submits application

3. CONFIRMATION
   Receives confirmation email
   Application status: "Under Review"

4. ADMIN REVIEW
   Admin sees application in queue
   Reviews credentials and coverage
   Checks website and references
   Approves application

5. SLA PROCESS
   System sends SLA via PandaDoc
   Vendor receives email with signing link
   Reviews and signs agreement
   Status updates to "Active"

6. RECEIVING LEADS
   Vendor logs into dashboard
   Sees notification: matched to HVAC request
   Views details: Central AC repair, 19106
   Contacts landlord directly
   Accepts job and completes work

7. BUILDING REPUTATION
   Receives 4.5-star review
   Performance score updates
   Ranks higher in future HVAC matches
   Receives more quality leads
```

### 8.3 Admin Journey: Daily Operations

**Scenario:** Admin's daily workflow managing the platform.

```
MORNING: CHECK DASHBOARD
├─ View overnight request count
├─ Check new vendor applications
├─ Review any urgent/emergency requests
└─ Note any flagged items

PROCESS NEW REQUESTS
├─ Open request queue (filter: "New")
├─ For each request:
│   ├─ Review details in quick view
│   ├─ Click "Match Vendors"
│   ├─ Review smart suggestions with scores
│   ├─ Verify suggestions make sense
│   ├─ Confirm or adjust selection
│   └─ Send introductions
└─ Mark all new requests as "Matching" or "Matched"

REVIEW APPLICATIONS
├─ Open applications queue
├─ For each pending application:
│   ├─ Review business credentials
│   ├─ Check website and references
│   ├─ Verify licensing/insurance claims
│   ├─ Approve or reject with reason
│   └─ Approved: System sends SLA
└─ Update any pending status changes

VENDOR MANAGEMENT
├─ Check SLA signing status
├─ Follow up on unsigned SLAs
├─ Review recent vendor reviews
├─ Address any performance concerns
└─ Update vendor notes as needed

AFTERNOON: FOLLOW-UPS
├─ Check matched requests from 3-5 days ago
├─ Verify follow-up emails sent
├─ Review any feedback received
└─ Mark completed requests

ANALYTICS REVIEW (WEEKLY)
├─ Check requests by service type trends
├─ Review match success rate
├─ Identify top-performing vendors
├─ Note any service gaps
└─ Plan vendor recruitment if needed
```

---

## Service Categories

### Complete Service Taxonomy

#### Group 1: Fix It / Build It (13 categories)

| Category | Sub-Services | Common Classifications |
|----------|--------------|------------------------|
| **Roofer** | Repair, Replacement, Inspection | Flat, Pitched, Shingle, Metal |
| **General Contractor** | Renovation, Addition, Gut Rehab | Premium, Standard, Budget finish |
| **Plumber / Sewer** | Repair, Install, Sewer Line | Leak, Drain, Water Heater, Fixtures |
| **Waterproofing** | Interior, Exterior, French Drain | Basement, Foundation, Crawlspace |
| **Electrician** | Repair, Panel, Rewiring | Outlets, Lighting, Panel Upgrade |
| **HVAC** | Install, Repair, Maintenance | AC, Heating, Mini-split, Ductwork |
| **Exterior Contractor** | Siding, Masonry, Pointing | Brick, Stucco, Vinyl, Stone |
| **Flooring** | Hardwood, Tile, Carpet, LVP | Install, Refinish, Repair |
| **Appliance Repair** | Washer, Dryer, Fridge, Stove | Repair, Install, Diagnose |
| **Handyman** | General repairs, small projects | Drywall, Fixtures, Assembly |
| **Painting** | Interior, Exterior | Walls, Trim, Cabinet, Deck |
| **Structural** | Foundation, Load-bearing | Repair, Reinforce, Inspect |
| **Architect / Design** | Plans, Permits, Design | Residential, Commercial |

#### Group 2: Property Care & Maintenance (7 categories)

| Category | Sub-Services | Common Classifications |
|----------|--------------|------------------------|
| **Cleaning** | Turnover, Deep Clean, Regular | Residential, Post-construction |
| **Clean Out / Junk** | Eviction, Estate, Hoarding | Full house, Garage, Basement |
| **Pest Control** | Treatment, Prevention | Rodents, Insects, Wildlife |
| **Landscaping / Snow** | Lawn, Trees, Snow Removal | Regular, One-time, Emergency |
| **Preventative Maintenance** | HVAC tune-up, Inspection | Annual, Seasonal |
| **Property Check** | Vacancy checks, Winterize | Weekly, Monthly |
| **Movers** | Local, Long-distance | Residential, Commercial |

#### Group 3: Compliance & Testing (6 categories)

| Category | Sub-Services | Common Classifications |
|----------|--------------|------------------------|
| **Lead Testing** | Inspection, Abatement | Pre-rental, Renovation |
| **Fire & Safety** | Extinguishers, Alarms, Exits | Install, Inspect, Certify |
| **Environmental** | Mold, Asbestos, Air Quality | Test, Remediate |
| **Compliance / City** | Permits, Inspections, Violations | L&I, Zoning, Code |
| **Legal / Eviction** | Filing, Process, Court | Eviction, Lease, Dispute |
| **Property Tax Appeals** | Assessment appeal | (External referral) |

#### Group 4: Professional & Financial (6 categories)

| Category | Sub-Services | Common Classifications |
|----------|--------------|------------------------|
| **Property Management** | Full service, Placement only | Residential, Commercial |
| **Insurance** | Landlord policy, Umbrella | Quote, Claim, Review |
| **Financing** | Purchase, Refinance, HELOC | Investment, Commercial |
| **Bookkeeping** | Monthly, Annual, Tax prep | QuickBooks, Custom |
| **Acquisitions** | Buying, Selling, Analysis | Wholesale, Retail |
| **RE Agent** | Buy, Sell, Lease | Investment, Residential |

#### Group 5: Creative & Knowledge (3 categories)

| Category | Sub-Services | Common Classifications |
|----------|--------------|------------------------|
| **Photography & Media** | Photos, Video, Virtual Tour | Listing, Marketing |
| **Boost My Knowhow** | Training, Coaching, Courses | New investor, Advanced |

---

## Data Model

### Core Entities

#### Service Requests

```
service_requests
├── id (UUID, PK)
├── created_at, updated_at
│
├── LANDLORD REFERENCE
│   ├── landlord_id (FK, nullable)
│   ├── landlord_email
│   ├── landlord_first_name
│   ├── landlord_last_name
│   ├── landlord_phone
│   └── contact_preference (phone|email|text|whatsapp|no_preference)
│
├── OWNERSHIP
│   ├── is_owner (boolean)
│   └── business_name (if not owner)
│
├── PROPERTY
│   ├── property_address
│   ├── zip_code
│   ├── property_type (row_home|single_family|duplex|triplex|small_multi|large_multi|new_construction|commercial)
│   ├── unit_count (1|2-10|11-99|100+)
│   ├── occupancy_status (occupied|vacant|partial)
│   ├── lat, lng (coordinates)
│
├── SERVICE
│   ├── service_type (ServiceCategory enum)
│   ├── service_details (JSONB - sub-categories)
│   ├── job_description (text)
│   ├── urgency (low|medium|high|emergency)
│   ├── budget_range (9 tiers)
│   └── finish_level (premium|standard|budget)
│
├── MEDIA
│   └── media_urls (array of URLs)
│
├── STATUS
│   ├── status (new|matching|matched|completed|cancelled)
│   ├── intro_sent_at
│   ├── follow_up_sent_at
│   └── follow_up_response
│
└── ADMIN
    └── admin_notes
```

#### Vendors

```
vendors
├── id (UUID, PK)
├── auth_user_id (FK to auth.users)
├── created_at, updated_at
│
├── STATUS
│   └── status (active|inactive|pending_review|rejected)
│
├── CONTACT
│   ├── contact_name
│   ├── email
│   ├── phone
│   ├── business_name
│   ├── website
│   └── location
│
├── SOCIAL
│   ├── instagram_url
│   ├── facebook_url
│   └── linkedin_url
│
├── SERVICES
│   ├── services (array of ServiceCategory)
│   └── specializations (JSONB)
│
├── CREDENTIALS
│   ├── qualifications
│   ├── is_licensed
│   ├── is_insured
│   ├── has_rental_experience
│   └── years_in_business
│
├── COVERAGE
│   ├── service_areas (array of zip codes)
│   ├── has_emergency_services
│   └── service_hours (JSONB)
│
├── BUSINESS
│   ├── employee_count
│   ├── job_size_min, job_size_max
│   ├── payment_methods (array)
│   └── referral_source
│
├── PERFORMANCE
│   ├── performance_score (0-5)
│   ├── vetting_score
│   └── portfolio_media_urls (array)
│
├── CONTRACT
│   ├── sla_envelope_id
│   ├── sla_status (not_sent|sent|delivered|viewed|signed|declined|voided)
│   ├── sla_signed_at
│   └── sla_document_url
│
├── ADMIN
│   ├── admin_notes
│   └── terms_accepted_at
```

#### Request-Vendor Matches

```
request_vendor_matches
├── id (UUID, PK)
├── request_id (FK)
├── vendor_id (FK)
├── created_at, updated_at
│
├── INTRODUCTION
│   ├── intro_sent (boolean)
│   └── intro_sent_at
│
├── RESPONSE
│   ├── vendor_accepted (boolean)
│   ├── vendor_responded_at
│   ├── response_time_seconds
│   └── declined_after_accept (boolean)
│
├── STATUS
│   ├── match_status (pending|intro_sent|vendor_accepted|vendor_declined|no_response|in_progress|completed|cancelled|no_show)
│   └── completed (boolean)
│
└── REVIEW
    ├── review_rating (1-5)
    ├── review_quality_rating
    ├── review_price_rating
    ├── review_timeline_rating
    ├── review_treatment_rating
    ├── review_text
    └── review_submitted_at
```

#### Landlords

```
landlords
├── id (UUID, PK)
├── auth_user_id (FK to auth.users)
├── created_at, updated_at
│
├── CONTACT
│   ├── email
│   ├── name
│   └── phone
│
├── PROPERTIES
│   └── properties (JSONB array)
│
├── ACCOUNT
│   ├── subscription_tier
│   └── request_count
```

### Entity Relationships

```
landlords ──1:N──► service_requests
                        │
                        ▼
              request_vendor_matches
                        │
                        ▼
                    vendors
```

---

## Smart Matching System

### Overview

The Smart Matching System is an intelligent algorithm that scores and ranks vendors for each service request based on multiple weighted factors. It provides administrators with ranked recommendations while maintaining the ability to override.

### Matching Algorithm

#### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| **Service Match** | 25% | Does vendor offer the exact service requested? |
| **Location Match** | 20% | Does vendor's service area include property zip code? |
| **Performance Score** | 15% | Vendor's overall quality rating from reviews |
| **Response Time** | 10% | Historical average time to respond to intros |
| **Availability** | 10% | Can vendor handle the urgency level? |
| **Specialty Match** | 10% | Does vendor specialize in the specific sub-category? |
| **Capacity** | 5% | Vendor's current workload (pending jobs) |
| **Price Fit** | 5% | Does vendor's typical price range match budget? |

#### Score Calculation

```
Total Score = Σ (factor_score × factor_weight) × 100

Where each factor_score is 0.0 to 1.0
```

#### Thresholds

| Threshold | Value | Meaning |
|-----------|-------|---------|
| **Recommended** | ≥ 65 | Vendor appears in suggestions |
| **High Confidence** | ≥ 75 | Strong match with good data coverage |
| **Max Recommendations** | 3 | Maximum vendors suggested per request |

### Factor Details

#### Service Match (25%)
- **1.0:** Vendor offers exact service category
- **0.5:** Vendor offers related service
- **0.0:** Vendor doesn't offer service

#### Location Match (20%)
- **1.0:** Property zip code in vendor's service areas
- **0.7:** Adjacent zip code
- **0.3:** Same city/region
- **0.0:** Outside service area

#### Performance Score (15%)
- Directly maps vendor's 0-5 rating to 0-1 score
- New vendors with no reviews: 0.6 (neutral)

#### Response Time (10%)
- **1.0:** Average response < 1 hour
- **0.8:** Average response < 4 hours
- **0.5:** Average response < 24 hours
- **0.3:** Average response > 24 hours
- New vendors: 0.5 (neutral)

#### Availability (10%)
- **Emergency requests:** Only vendors with `has_emergency_services = true`
- **High urgency:** Prefer vendors with emergency capability
- **Normal:** All active vendors eligible

#### Specialty Match (10%)
- **1.0:** Vendor specializes in exact sub-category
- **0.5:** Vendor handles sub-category but not specialty
- **0.0:** Sub-category not relevant

#### Capacity (5%)
- **1.0:** No pending jobs
- **0.7:** 1-2 pending jobs
- **0.4:** 3-5 pending jobs
- **0.2:** 6+ pending jobs

#### Price Fit (5%)
- **1.0:** Vendor's range overlaps significantly with budget
- **0.5:** Partial overlap
- **0.0:** No overlap or no budget specified

### Matching UI Components

| Component | Purpose |
|-----------|---------|
| **MatchScoreBadge** | Circular indicator showing 0-100 score |
| **ConfidenceIndicator** | Tag showing high/medium/low confidence |
| **MatchFactorsList** | Detailed breakdown of all 8 factors |
| **VendorSuggestionCard** | Card displaying vendor with score and details |

### API Endpoint

**GET /api/requests/[id]/suggestions**

Returns ranked vendor suggestions with full scoring details.

```json
{
  "request": {
    "id": "uuid",
    "service_type": "plumber_sewer",
    "zip_code": "19103",
    "urgency": "emergency"
  },
  "suggestions": [
    {
      "vendor": { /* vendor details */ },
      "matchScore": {
        "total": 89,
        "factors": {
          "serviceMatch": { "score": 1.0, "reason": "Offers plumber services" },
          "locationMatch": { "score": 0.95, "reason": "Serves 19103" },
          /* ... other factors ... */
        },
        "confidence": "high",
        "recommended": true
      }
    }
  ],
  "otherVendors": [ /* remaining active vendors */ ],
  "meta": {
    "totalEligible": 45,
    "totalRecommended": 3,
    "averageScore": 78,
    "scoringVersion": "1.0"
  }
}
```

---

## Communication System

### Email System

**Provider:** Resend

#### Email Templates

| Trigger | Recipient | Template | Purpose |
|---------|-----------|----------|---------|
| Request submitted | Landlord | `request-received` | Confirm submission |
| Vendors matched | Landlord | `vendor-introduction` | Share vendor contacts |
| Vendors matched | Vendors | `landlord-introduction` | Share job details |
| 3-5 days post-intro | Landlord | `follow-up` | Request feedback |
| Review submitted | Vendor | `review-notification` | Share review |
| Application submitted | Vendor | `application-received` | Confirm application |
| Application approved | Vendor | `application-approved` | Welcome to platform |
| Application rejected | Vendor | `application-rejected` | Explain decision |
| SLA sent | Vendor | `sla-request` | Request signature |
| Password reset | User | `password-reset` | Reset link |

#### Email Content Standards

- Clear subject lines with context
- Mobile-responsive HTML templates
- Plain text fallbacks
- Unsubscribe links where required
- Consistent branding

### SMS System

**Provider:** Twilio

#### SMS Triggers

| Trigger | Recipient | Content |
|---------|-----------|---------|
| Request submitted | Landlord | Confirmation with request ID |
| Vendors matched | Landlord | Notification that vendors were matched |
| Vendors matched | Vendors | New job opportunity alert |
| Follow-up | Landlord | Reminder to provide feedback |
| Application approved | Vendor | Welcome message |

#### SMS Configuration

- Messages sent in parallel with emails
- Graceful failure (doesn't block operations)
- E.164 phone number format required
- Rate limiting to prevent abuse

---

## Analytics & Reporting

### Dashboard Metrics

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| **Total Requests** | COUNT(service_requests) | Volume tracking |
| **New Requests** | COUNT WHERE status = 'new' | Backlog monitoring |
| **Active Vendors** | COUNT WHERE status = 'active' | Supply health |
| **Total Landlords** | COUNT(landlords) | User base size |

### Analytics Views

#### Requests Over Time
- Weekly request count
- Monthly request count
- Trend analysis

#### Requests by Service Type
- Distribution across 35 categories
- Identification of high-demand services
- Gap analysis for vendor recruitment

#### Match Success Rate
```
Success Rate = (Completed with positive feedback / Total Matched) × 100
```

#### Time to Match
```
Average Time = AVG(intro_sent_at - created_at) for matched requests
```

#### Vendor Leaderboard
| Rank | Metrics |
|------|---------|
| 1-10 | Sorted by: Total matches, Average rating, Response time |

### Export Capabilities

| Entity | Fields | Format |
|--------|--------|--------|
| Requests | All fields, matches, reviews | CSV |
| Vendors | All fields, performance metrics | CSV |
| Landlords | Profile, request history | CSV |

---

## Security & Compliance

### Authentication Architecture

**Provider:** Supabase Auth

| User Type | Auth Method | Session |
|-----------|-------------|---------|
| Landlord | Email/Password | JWT token |
| Vendor | Email/Password | JWT token |
| Admin | Email/Password | JWT token with role |

### Authorization Model

**API Routes use `createAdminClient()` with manual authorization:**

```typescript
// 1. Authenticate with standard client
const { data: { user } } = await supabase.auth.getUser();

// 2. Use admin client for DB operations (bypasses RLS)
const adminClient = createAdminClient();

// 3. Manual authorization check
if (resource.owner_id !== user.id) {
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
}
```

### Row Level Security (RLS)

All tables have RLS enabled as defense-in-depth:

| Table | Policies |
|-------|----------|
| landlords | Admin full access, own user read/update |
| vendors | Admin full access, own user read/update |
| service_requests | Admin full, landlord own, anon insert |
| request_vendor_matches | Admin full, vendor own read, landlord own read/update |

### Data Protection

| Measure | Implementation |
|---------|----------------|
| Encryption at rest | Supabase default (AES-256) |
| Encryption in transit | HTTPS/TLS 1.3 |
| Password hashing | Supabase Auth (bcrypt) |
| Session management | JWT with expiration |
| Input validation | Server-side validation on all inputs |
| SQL injection | Parameterized queries via Supabase client |
| XSS prevention | React's built-in escaping |

### Compliance Considerations

| Area | Status |
|------|--------|
| GDPR | Email-based account, deletion on request |
| CAN-SPAM | Unsubscribe links in marketing emails |
| PCI | No card storage (external payment) |
| Accessibility | Ant Design WCAG compliance |

---

## Integration Ecosystem

### Current Integrations

| System | Purpose | Status |
|--------|---------|--------|
| **Supabase** | Database, Auth, Storage | Active |
| **Resend** | Transactional email | Active |
| **Twilio** | SMS notifications | Active |
| **PandaDoc** | Contract/SLA signing | Active |
| **Vercel** | Hosting, CDN, Analytics | Active |

### PandaDoc Integration

**Purpose:** Digital SLA signing for vendor onboarding

**Flow:**
1. Admin clicks "Send SLA" on vendor profile
2. API creates document from template with vendor tokens
3. PandaDoc sends signing request to vendor
4. Vendor signs electronically
5. Webhook updates vendor status
6. Signed document URL stored

**Template Tokens:**
- `{{vendor_name}}` - Contact name
- `{{business_name}}` - Business name
- `{{commission_rate}}` - Fee percentage (future)

### Future Integration Opportunities

| System | Purpose | Priority |
|--------|---------|----------|
| **Stripe** | Payment processing for referral fees | High |
| **QuickBooks** | Accounting integration | Medium |
| **Calendly** | Scheduling consultations | Low |
| **Zapier** | Workflow automation | Low |

---

## Product Roadmap

### Phase 1: Shadow MVP (Completed)

| Feature | Status |
|---------|--------|
| Request form (no login required) | ✅ |
| Signup nudge | ✅ |
| Admin dashboard with request queue | ✅ |
| Vendor list management | ✅ |
| Manual vendor selection (3 matches) | ✅ |
| Automated intro emails | ✅ |
| Initial testing with 5-10 landlords | ✅ |

### Phase 2: Traffic Split (Completed)

| Feature | Status |
|---------|--------|
| Vendor application flow | ✅ |
| Landlord dashboard | ✅ |
| Follow-up emails + feedback | ✅ |
| Vendor reviews | ✅ |
| Graduated signup nudge | ✅ |
| Smart matching suggestions | ✅ |
| SMS notifications | ✅ |
| SLA/contract management | ✅ |

### Phase 3: Full Platform (Current)

| Feature | Status |
|---------|--------|
| All service categories live | ✅ |
| AI-assisted matching | In Progress |
| Vendor performance scoring | ✅ |
| Vendor portfolio uploads | In Progress |
| Full analytics dashboard | ✅ |
| WordPress → content only | In Progress |

### Phase 4: Scale (Planned)

| Feature | Status |
|---------|--------|
| Subscription tiers | Planned |
| Premium features | Planned |
| Vendor self-service portal enhancements | Planned |
| Full AI matching automation | Planned |
| Mobile app optimization | Planned |
| Payment processing | Planned |

---

## Success Metrics & KPIs

### Primary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Request Volume** | Requests per week | Growing WoW |
| **Match Success Rate** | % with confirmed successful connection | > 70% |
| **Time to Match** | Request to intro sent | < 4 hours (normal), < 1 hour (emergency) |
| **Signup Conversion** | Form submitters who create accounts | > 30% |
| **Repeat Usage** | Landlords with 2+ requests | > 40% |

### Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Vendor Satisfaction** | Lead quality feedback | > 4.0/5.0 |
| **Review Completion** | Completed jobs with reviews | > 50% |
| **Vendor Acceptance Rate** | Intros that vendors accept | > 60% |
| **Gross Revenue per Request** | Average referral fee | Track trend |

### Health Indicators

| Indicator | Warning Threshold |
|-----------|-------------------|
| Unprocessed requests > 24h | > 5 requests |
| Vendor response rate | < 50% |
| Average vendor rating | < 3.5 |
| Request cancellation rate | > 20% |

---

## Glossary

| Term | Definition |
|------|------------|
| **Active Vendor** | Vendor with status "active", visible in matching |
| **Admin Client** | Supabase client that bypasses RLS for API operations |
| **Emergency Request** | Urgency level requiring immediate response |
| **Intro Email** | Email sent to landlord and vendors when matched |
| **Match** | Association between a request and a vendor |
| **Match Score** | 0-100 score indicating vendor-request fit |
| **Performance Score** | 0-5 rating derived from landlord reviews |
| **RLS** | Row Level Security - database-level access control |
| **Service Category** | One of 35 defined service types |
| **SLA** | Service Level Agreement signed by vendors |
| **Smart Matching** | Algorithm-based vendor suggestion system |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 2026 | Product Team | Initial comprehensive document |

---

*This document is maintained by the Product Team and should be updated as features evolve.*
