# Real Landlording Platform - Strategic Roadmap 2026

## Executive Summary

A B2B vendor matching platform connecting Philadelphia landlords with vetted service providers. The platform streamlines vendor discovery, vetting, and engagement while generating revenue through referral fees and premium services.

**Team**: Al (Product/Tech), Michael (Operations/Business), Sheryl & Dror (Marketing/Growth)

---

## Current State (December 2025)

### What We've Built (MVP Complete)

| Component               | Status  | Description                                                                                       |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| **Admin Dashboard**     | ✅ Done | Full internal management with requests, vendors, applications, landlords, and analytics pages     |
| **Matching System**     | ✅ Done | Manual matching with vendor selection, automated intro emails to landlord and vendors             |
| **Request Flow**        | ✅ Done | Multi-step service request form with 35+ service categories, dynamic sub-questions, media uploads |
| **Vendor Onboarding**   | ✅ Done | Public application form with service areas, qualifications, dynamic equipment types               |
| **Landlord Dashboard**  | ✅ Done | View/track requests, profile management, request history                                          |
| **Vendor Dashboard**    | ✅ Done | View matched jobs, accept/decline leads, stats overview                                           |
| **Email System**        | ✅ Done | Resend integration with templates for request received, vendor intro, follow-up                   |
| **Vetting & Scoring**   | ✅ Done | Automated vetting score (licensed, insured, years in business) with admin adjustment              |
| **Service Taxonomy**    | ✅ Done | 35+ categories grouped by type, with emergency flags and finish levels                            |
| **Authentication**      | ✅ Done | Separate auth for admin, landlords, and vendors with password reset                               |
| **Terms & Privacy**     | ✅ Done | Vendor terms page and user/landlord terms page with form integration                              |
| **CSV Export**          | ✅ Done | Export functionality for admin pages                                                              |
| **Service Areas**       | ✅ Done | Zip code based with address autocomplete                                                          |
| **Media Uploads**       | ✅ Done | Photo/video uploads for service requests                                                          |
| **Signup Nudge**        | ✅ Done | Graduated nudge for repeat requesters to create accounts                                          |
| **Analytics Dashboard** | ✅ Done | Basic KPI tracking (requests/week, match rate, vendor leaderboard)                                |

### Tech Stack

- **Frontend**: Next.js 14+ (App Router), Ant Design, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Email**: Resend
- **Hosting**: Vercel
- **Testing**: Playwright E2E tests

### What's In Progress / Next Up

- [ ] Follow-up automation (3-5 day check-in)
- [ ] Review system (landlord reviews vendors after job)
- [ ] Stripe integration for fee collection
- [ ] Homepage/landing page optimization
- [ ] AI-assisted matching suggestions

---

## Strategic Priorities

### 1. Revenue Model (Decided)

**Referral Fee Model**: Vendors pay referral fees for successful jobs.

| Model Component | Details                                          |
| --------------- | ------------------------------------------------ |
| Fee Structure   | Per-match or % of invoice (by category)          |
| Collection      | Post-job completion, tracked via follow-up       |
| Terms           | Documented in vendor agreement (terms page live) |

---

## Roadmap by Quarter

### Q1 2026: Revenue & Growth

**Theme**: Monetize, scale operations, improve match quality

#### Product & Development (Al)

| Week  | Deliverable                                         | Priority | Status      |
| ----- | --------------------------------------------------- | -------- | ----------- |
| 1-2   | Follow-up email automation (3-5 day)                | P0       | In Progress |
| 1-2   | Landlord review system                              | P0       | Pending     |
| 3-4   | Stripe fee collection integration                   | P0       | Pending     |
| 3-4   | Homepage redesign                                   | P1       | Pending     |
| 5-6   | Vendor performance scoring (response time, reviews) | P1       | Pending     |
| 7-8   | AI-assisted match suggestions                       | P2       | Pending     |
| 9-10  | SMS notifications (Twilio)                          | P2       | Pending     |
| 11-12 | Vendor self-service improvements                    | P2       | Pending     |

#### Business Operations (Michael)

| Task                                        | Owner   | Status      |
| ------------------------------------------- | ------- | ----------- |
| Vendor outreach for referral fee agreements | Michael | In Progress |
| Define fee structure by service category    | Michael | In Progress |
| Onboard 20 additional vetted vendors        | Michael | Pending     |
| Set up invoice/payment tracking             | Michael | Pending     |
| Document operational playbooks              | Michael | Pending     |

#### Marketing (Sheryl & Dror)

| Task                                 | Owner  | Status      |
| ------------------------------------ | ------ | ----------- |
| FB group engagement strategy         | Sheryl | In Progress |
| Content calendar for Q1              | Dror   | Pending     |
| Case studies from successful matches | Dror   | Pending     |
| Newsletter optimization              | Dror   | Pending     |

#### Q1 Success Metrics

- [ ] 100 matching requests processed
- [ ] 60% match success rate
- [ ] 50% of successful matches paying referral fees
- [ ] 50 active vetted vendors
- [ ] First $X in referral revenue

---

### Q2 2026: Optimization & Scale

**Theme**: Improve conversion, automate operations, expand vendor network

#### Product & Development

| Deliverable                  | Priority | Notes                                             |
| ---------------------------- | -------- | ------------------------------------------------- |
| Enhanced matching algorithm  | P0       | Incorporate reviews, response time, vetting score |
| Notification center (in-app) | P1       | Real-time updates for landlords and vendors       |
| Vendor public profiles       | P1       | SEO-friendly vendor pages                         |
| Mobile optimization          | P1       | PWA or responsive improvements                    |
| Bulk request handling        | P2       | For property managers                             |

#### Business Operations

| Task                    | Focus                                          |
| ----------------------- | ---------------------------------------------- |
| Analyze Q1 match data   | Identify top-performing categories and vendors |
| Refine vetting criteria | Based on vendor performance data               |
| Implement NPS surveys   | Measure satisfaction                           |
| A/B test fee structures | Optimize for vendor acceptance                 |

#### Q2 Success Metrics

- [ ] 200 matching requests
- [ ] 70% match success rate
- [ ] 80% fee collection rate
- [ ] 75 active vendors
- [ ] NPS > 40

---

### Q3 2026: Premium Features

**Theme**: Introduce premium tiers, multiple revenue streams

#### Product & Development

| Deliverable                    | Priority | Notes                                          |
| ------------------------------ | -------- | ---------------------------------------------- |
| Premium vendor profiles        | P0       | Enhanced visibility, badges, priority matching |
| Vendor subscription tier       | P0       | Monthly fee for premium features               |
| Advanced analytics for vendors | P1       | Market insights, lead quality data             |
| Referral program               | P1       | User acquisition via word-of-mouth             |
| In-platform messaging          | P2       | Vendor-landlord communication                  |

#### Q3 Success Metrics

- [ ] 10 premium vendor subscribers
- [ ] 20% of revenue from subscriptions
- [ ] 350 matching requests
- [ ] Vendor retention > 85%

---

### Q4 2026: Platform Expansion

**Theme**: New features, market expansion prep

#### Product & Development

| Deliverable                   | Priority | Notes                             |
| ----------------------------- | -------- | --------------------------------- |
| RFP/quote system              | P1       | Vendors submit quotes in-platform |
| Contract templates            | P2       | Basic agreement templates         |
| Geographic expansion research | P2       | Identify next markets             |
| AI matching automation        | P1       | ML-based recommendations          |

#### Q4 Success Metrics

- [ ] 500 matching requests
- [ ] $XX,XXX ARR
- [ ] 150 active vendors
- [ ] 25 premium subscribers
- [ ] Geographic expansion plan ready

---

## Key Performance Indicators (KPIs)

### North Star Metric

**Successful Matches per Month** - Directly tied to revenue and value delivery

### Primary KPIs

| KPI                  | Definition                          | Target Q1 | Target Q4 |
| -------------------- | ----------------------------------- | --------- | --------- |
| Match Request Volume | Total requests submitted            | 100       | 500       |
| Match Success Rate   | Requests → Completed matches        | 60%       | 70%       |
| Fee Collection Rate  | Successful matches → Fees collected | 50%       | 90%       |
| Vendor Response Time | Avg time to first vendor response   | <24h      | <12h      |
| Client Satisfaction  | Post-match NPS                      | 35        | 50        |

### Secondary KPIs

| KPI                 | Definition                         | Purpose            |
| ------------------- | ---------------------------------- | ------------------ |
| Time to Match       | Request → Vendor assignment        | Efficiency         |
| Vendor Utilization  | % of vendors receiving leads/month | Network health     |
| Repeat Request Rate | Clients making 2+ requests         | Product-market fit |
| Signup Conversion   | Form submitters → Account creators | Engagement         |

---

## Technical Debt & Improvements

| Item                      | Priority | Notes                       |
| ------------------------- | -------- | --------------------------- |
| Test coverage expansion   | P1       | More E2E and unit tests     |
| Error monitoring (Sentry) | P1       | Better error tracking       |
| Performance optimization  | P2       | Image optimization, caching |
| Database indexes          | P2       | Query performance           |
| Accessibility audit       | P2       | WCAG compliance             |

---

## Risk Register

| Risk                                 | Likelihood | Impact | Mitigation                                     |
| ------------------------------------ | ---------- | ------ | ---------------------------------------------- |
| Vendors bypass platform after intro  | High       | High   | Strong agreements, ongoing value, fee tracking |
| Low match quality damages reputation | Medium     | High   | Vetting scores, reviews, quick removal         |
| Revenue model doesn't scale          | Medium     | High   | Test multiple fee structures early             |
| Competition from established players | Medium     | Medium | Niche focus, community, superior service       |

---

## Team Responsibilities

### Al (Product & Technology)

- Platform development and maintenance
- Technical architecture decisions
- Integration implementations
- Data infrastructure and analytics

### Michael (Operations & Business)

- Vendor relations and onboarding
- Vetting process management
- Financial operations and fee collection
- Legal coordination
- KPI monitoring and reporting

### Sheryl (Marketing - Community)

- FB group management and growth
- Partnership development
- Event coordination

### Dror (Marketing - Content)

- Content strategy and production
- Newsletter management
- SEO and website optimization
- Social media presence

---

## Document History

| Version | Date         | Author | Changes                                                          |
| ------- | ------------ | ------ | ---------------------------------------------------------------- |
| 1.0     | Dec 2024     | Al     | Initial comprehensive roadmap                                    |
| 2.0     | Dec 31, 2025 | Al     | Updated with completed MVP features, revised priorities for 2026 |

---

_This is a living document. Review and update monthly during team syncs._
