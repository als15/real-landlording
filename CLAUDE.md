Real Landlording Platform
Product Requirements Document

---

## IMPORTANT: Development Guidelines

**Before writing any code, review these documents:**

1. **`docs/DEVELOPMENT_PATTERNS.md`** - Critical patterns for Supabase auth, RLS, and API routes
   - Always use `createAdminClient()` for database operations in API routes
   - Passwords are in Supabase Auth, NOT in database tables
   - Common issues and their solutions are documented here

**Key Rules:**
- API routes should use `createAdminClient()` + manual authorization (not RLS)
- Password operations use `supabase.auth.admin.updateUserById()`, never direct table updates
- When adding new features, update `docs/DEVELOPMENT_PATTERNS.md` with any new patterns or issues

---

Overview
What We're Building
A platform that connects Philadelphia landlords with vetted service vendors. Landlords submit requests, we match them with the right vendors, and facilitate the introduction. The platform replaces our current WordPress-based manual process with a scalable, automated system.
Why We're Building It
We've validated the model manually: 800+ referral requests, $60k revenue, 2,900 engaged landlords in our community. The bottleneck is us — we can't scale manual matching. This platform removes that bottleneck while maintaining the quality and trust we've built.
Current State
WordPress website with a form
Manual processing of every request
Vendor information tracked in WordPress plugin
Introductions made via personal email
Users
Landlords
Small- midsize landlords in Philadelphia managing rental properties. They need reliable vendors but don't have the network or time to vet them. Typically own 1-20 units but there are members using the service with many more units.
Vendors
Service providers who work with rental properties. They want qualified leads without marketing spend. They're willing to pay referral fees for good matches.
Vendor Types Supported
• Clean-Out Services
• Lead Testing
• Boost My Skills (training)
• Locksmith / Security
• Compliance, Legal, Property Tax
• Maintenance
• Electrician
• Move-ins
• Exterior Contractor
• Painter
• General Contractor
• Pest Control
• Handyman
• Plumber
• HVAC
• Roofer

• Windows / Doors

Admins (Us)
The Real Landlording team. We manage vendors and business relations with vendors, review matches, handle edge cases, and monitor platform health. The admin dashboard is our primary tool.

User Flows
Flow 1: Landlord Submits a Request
Landlord visits reallandlording.com
↓
Fills request form (no login required)
Service type, location, job description, urgency, contact info
↓
Signup nudge: "Create account to track your matches"
↓ ↓
Signs up → Dashboard access Skips → Email-only updates

Graduated nudge: If same email submits a second request without account, stronger message: "You have 2 requests — create an account to manage them."

Flow 2: Vendor Onboarding
Path A: We Invite
Admin creates vendor profile → Vendor receives invite email → Vendor confirms details → Goes live

Path B: Vendor Applies
Vendor fills application → Admin reviews → Approve/Reject → Vendor notified

Path A&B, Vendor gets access to a Dashboard + Alerts and reminders (SMS, Email)
If approved → access dashboard
Flow 3: Matching and Introduction
New request appears in admin dashboard
↓
System suggests matches (manual categorizing now, AI later)
↓
-Systemselects 3 vendors, Admin can writeoff
↓
Automated intro emails sent to landlord + vendors
↓
Automated Follow-up after 3-5 days: "How did it go?"
↓
Landlord reviews vendor (feeds into vendor performance)

Hybrid Introduction Model:
Standard requests: Automated intro emails
High-value/complex: Personal intro from admin (future premium feature)

Data Model
Landlord Profile
Field
Description
Name
Full name
Email
Primary contact email
Phone
Contact phone number
Properties
Optional list of addresses or zip codes managed
Account Created
Date account was created
Request Count
Number of requests submitted
Subscription Tier
Future: Basic, Pro, Premium

Vendor Profile
Field
Description
Status
Active, Inactive, Pending Review, Rejected
Contact Name
Owner or primary contact
Email / Phone
Contact information
Business Name
Company name
Website
Business website URL
Location
Business location
Services
From predefined list + other (free text)
Qualifications
Experience and credentials
Licensed & Insured
Yes / No
Rental Experience
Has worked with rental properties (Yes / No)
Service Areas
Zip codes or neighborhoods served
Call Preferences
Best times/methods to reach
Portfolio Media
Photos/videos of past work (uploaded by vendor)
Performance Score
Derived from landlord reviews
Admin Notes
Internal comments (not visible to vendor)
Terms Accepted
Yes/No + date accepted

Service Request
Field
Description
Request ID
Unique identifier
Landlord
Linked account or email if no account
Service Type
From predefined vendor types
Property Location
Zip code or address
Job Description
Details of what's needed
Urgency
Low, Medium, High, Emergency
Budget Range
Optional price range
Status
New, Matching, Matched, Completed, Cancelled
Matched Vendors
List of up to 3 vendors
Intro Sent Date
When introduction emails were sent
Follow-up Response
Did it work out? Landlord feedback
Vendor Review
Landlord's rating/review of vendor after job completion
Admin Notes
Internal notes on the request

Matching Logic
Matching is manual initially, with AI automation planned for later phases. These factors determine a good match:
Factor
Description
Service Type
Sub service
Vendor must offer the requested service
Location
Vendor's service area includes property location
Availability
Vendor status must be Active
Job Complexity
Simple repairs → handyman; complex jobs → specialists/GC
Performance score

SLA responsiveness
Match acceptance rate
Vendor rating (internal, onboarding)
Past successful jobs
No-show avoidance
User Reviews
Rental Experience
Prefer vendors who've worked with rentals
Urgency
Emergency requests → vendors known for fast response
Budget
If budget constraints indicated, factor in vendor pricing
License / certification requirements

AI Matching (Future): Every manual match creates training data. Over time, we build a model that learns optimal vendor-request pairings. AI suggests ranked matches; admin can approve or override.

Admin Dashboard
The admin dashboard is our primary tool for running the platform.
View
Features
Requests Queue
List all requests, filter by status, quick view details, assign vendors, sort by date/urgency/service type
Vendor Management
List vendors with status filters, add/edit vendors, change status, view match history and reviews, add internal notes
Vendor Applications
Queue of pending applications, review details, approve/reject/request more info
Landlord Directory
List landlords with accounts, view request history, see email-only submissions
Analytics
Requests per week/month, requests by service type, match success rate, vendor leaderboard, signup conversion rate

Technical Approach
Layer
Technology
Frontend
Next.js (React framework)
Backend / Database
Supabase (PostgreSQL + Auth + Realtime)
Email
Resend or similar transactional email service
Hosting
Vercel (Next.js) + Supabase cloud

Why This Stack
Full codebase control — AI assistants understand it completely
Fast iteration — proven rapid development combo
Low cost — generous free tiers, pay-as-you-grow
Supabase handles auth, database, and realtime out of the box
Migration: New platform runs parallel to WordPress initially. WordPress becomes content-only at reallandlording.com/articles. See Migration Strategy document for details.

Development Phases
Phase
Deliverables
Phase 1Shadow MVP
Request form (no login required), signup nudge, admin dashboard with request queue + vendor list, manual vendor selection (3 matches), automated intro emails, test with 5-10 landlords
Phase 2Traffic Split
Vendor application flow, landlord dashboard, follow-up emails + feedback, vendor reviews, graduated signup nudge, route one service category from WordPress
Phase 3Full Platform
All service categories on new platform, AI-assisted matching, vendor performance scoring, vendor portfolio uploads (photos/videos), analytics dashboard, WordPress → content only
Phase 4Scale
Subscription tiers, premium features (personal intros, priority matching), vendor self-service portal, full AI matching automation

Success Metrics
Metric
Definition
Request Volume
Number of requests processed per week
Request-to-MatchMatch Success Rate
% of requests with confirmed successful connection
Time to Match
Average time from request to intro sent
Signup Conversion
% of form submitters who create accounts
Repeat Usage
% of landlords who submit multiple requests
Vendor Satisfaction
Lead quality feedback from vendors
Review Completion
% of completed jobs that receive landlord reviews
Vendor Acceptance Rate

Gross Revenue per Request
