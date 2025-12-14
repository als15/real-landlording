# End-to-End Testing Checklist

Complete testing guide for the Real Landlording platform. Work through each section in order.

---

## Prerequisites

- [ ] Database migrations are up to date
- [ ] Environment variables configured (Supabase, Resend)
- [ ] At least 2-3 test vendors in "active" status
- [ ] Admin account created

---

## 1. Request Submission Flow

### 1.1 Guest User (No Account)

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1.1.1 | Visit `/request` as logged-out user | See "Sign In" button in header | [ ] |
| 1.1.2 | Fill Step 1: Select service category | Sub-questions appear based on category | [ ] |
| 1.1.3 | Fill Step 2: Job description (20+ chars) | Can proceed to Step 3 | [ ] |
| 1.1.4 | Fill Step 3: Contact info + property | Address autocomplete works, zip auto-fills | [ ] |
| 1.1.5 | Submit form | Success message + Signup Nudge modal appears | [ ] |
| 1.1.6 | Check "Request Submitted!" message | Shows email where matches will be sent | [ ] |
| 1.1.7 | Skip signup | Modal closes, can submit another request | [ ] |

### 1.2 Guest User - Graduated Nudge (2nd Request)

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1.2.1 | Submit 2nd request with SAME email | Different modal: "You have 2 requests!" | [ ] |
| 1.2.2 | Check header color | Gold/amber instead of green | [ ] |
| 1.2.3 | Check CTA button | Says "Create Account & Track Requests" | [ ] |
| 1.2.4 | Check message | "Manage all your requests in one dashboard" | [ ] |

### 1.3 Logged-in Landlord

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1.3.1 | Log in as landlord, visit `/request` | See avatar/name in header (not "Sign In") | [ ] |
| 1.3.2 | Check Step 3 | Contact fields pre-filled with profile data | [ ] |
| 1.3.3 | Submit request | Success modal (not signup nudge) | [ ] |
| 1.3.4 | Click "Go to My Dashboard" | Redirects to `/dashboard` | [ ] |
| 1.3.5 | See new request in dashboard | Request shows with "New" status | [ ] |

### 1.4 Email Confirmation

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1.4.1 | Check landlord's email | Received "Request Received" confirmation | [ ] |
| 1.4.2 | Email contains | Service type, property address, "24-48 hours" promise | [ ] |

---

## 2. Admin Matching Flow

### 2.1 View Requests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 2.1.1 | Log in as admin, go to `/requests` | See requests queue | [ ] |
| 2.1.2 | Filter by "New" status | Only new requests shown | [ ] |
| 2.1.3 | Click on a request | Details drawer/modal opens | [ ] |
| 2.1.4 | See all request info | Service type, property, description, contact info | [ ] |

### 2.2 Match Vendors

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 2.2.1 | Click "Match Vendors" button | Matching modal opens | [ ] |
| 2.2.2 | See vendor list | Vendors filtered by service type | [ ] |
| 2.2.3 | See vendor scores | Performance scores displayed | [ ] |
| 2.2.4 | Select 3 vendors | Checkboxes allow max 3 | [ ] |
| 2.2.5 | Try to select 4th | Should be prevented or warned | [ ] |
| 2.2.6 | Click "Send Introductions" | Confirmation message | [ ] |
| 2.2.7 | Request status changes | From "New" to "Matched" | [ ] |

### 2.3 Introduction Emails

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 2.3.1 | Check landlord email | Received intro email with 3 vendor details | [ ] |
| 2.3.2 | Landlord email contains | Vendor names, phones, emails, websites | [ ] |
| 2.3.3 | Landlord email contains | Licensing/insurance status for each | [ ] |
| 2.3.4 | Check vendor emails (all 3) | Each received job referral email | [ ] |
| 2.3.5 | Vendor email contains | Job details, landlord contact info | [ ] |
| 2.3.6 | Vendor email contains | "24-hour response expectation" | [ ] |

---

## 3. Vendor Flow

### 3.1 Vendor Dashboard

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 3.1.1 | Log in as matched vendor | See `/vendor/dashboard` | [ ] |
| 3.1.2 | See job in list | New referral appears | [ ] |
| 3.1.3 | See stats update | "Pending" count increases | [ ] |
| 3.1.4 | Click job to view details | Modal shows full job info | [ ] |
| 3.1.5 | Click "Accept Job" | Status changes to accepted | [ ] |

### 3.2 Vendor Application (New Vendor)

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 3.2.1 | Visit `/vendor/apply` | Application form loads | [ ] |
| 3.2.2 | Fill all required fields | Form validates | [ ] |
| 3.2.3 | Service areas autocomplete | Can search by neighborhood/city | [ ] |
| 3.2.4 | Business address autocomplete | Google Places works | [ ] |
| 3.2.5 | Submit application | Success message | [ ] |
| 3.2.6 | Try to resubmit same email | Error: "already pending review" | [ ] |

### 3.3 Admin Approves Vendor

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 3.3.1 | Go to `/applications` | See pending applications | [ ] |
| 3.3.2 | Click to review | Application details shown | [ ] |
| 3.3.3 | Click "Approve" | Vendor status → Active | [ ] |
| 3.3.4 | Vendor receives email | Welcome email with login info | [ ] |
| 3.3.5 | Vendor can log in | Access to vendor dashboard | [ ] |

### 3.4 Existing User Applies as Vendor

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 3.4.1 | Use email already registered as landlord | Application submits | [ ] |
| 3.4.2 | Admin approves | Message: "linked to existing account" | [ ] |
| 3.4.3 | User logs in with existing password | Can access both dashboards | [ ] |

---

## 4. Follow-up Flow

### 4.1 Trigger Follow-up (Manual)

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 4.1.1 | Wait 3+ days OR manually trigger cron | `/api/cron/follow-up` | [ ] |
| 4.1.2 | Check landlord email | Received follow-up email | [ ] |
| 4.1.3 | Email asks | "How did it go?" with vendor names | [ ] |
| 4.1.4 | Request has `followup_sent_at` | Timestamp recorded | [ ] |

---

## 5. Review & Scoring Flow

### 5.1 Submit Review

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 5.1.1 | Log in as landlord | Go to `/dashboard` | [ ] |
| 5.1.2 | Find matched request | Click to view details | [ ] |
| 5.1.3 | See matched vendors | "Leave Review" button visible | [ ] |
| 5.1.4 | Click "Leave Review" | Review modal opens | [ ] |
| 5.1.5 | Select star rating (1-5) | Stars highlight | [ ] |
| 5.1.6 | Add optional comment | Text area accepts input | [ ] |
| 5.1.7 | Submit review | Success message | [ ] |
| 5.1.8 | Review saved | Can't submit another for same vendor | [ ] |

### 5.2 Score Updates

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 5.2.1 | Check vendor record after review | `performance_score` updated | [ ] |
| 5.2.2 | Check `total_reviews` | Incremented by 1 | [ ] |
| 5.2.3 | 5-star review | Score increases | [ ] |
| 5.2.4 | 1-star review | Score decreases | [ ] |
| 5.2.5 | Admin: GET `/api/admin/scores` | See updated vendor scores | [ ] |
| 5.2.6 | Admin: POST `/api/admin/scores` | Can trigger recalculation | [ ] |

### 5.3 Score Calculation Accuracy

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 5.3.1 | New vendor (no reviews) | Score = 50, Tier = "New" | [ ] |
| 5.3.2 | Vendor with 5x 5-star reviews | Score > 65, Tier = "Good" or higher | [ ] |
| 5.3.3 | Vendor with 5x 1-star reviews | Score < 35, Tier = "Below Average" or "Poor" | [ ] |
| 5.3.4 | Check confidence dampening | 1 review doesn't give extreme score | [ ] |

---

## 6. Landlord Dashboard

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 6.1 | View all requests | List shows all submitted requests | [ ] |
| 6.2 | See request statuses | New, Matching, Matched, Completed | [ ] |
| 6.3 | Profile page works | `/dashboard/profile` loads | [ ] |
| 6.4 | Can update profile | Name, phone save correctly | [ ] |
| 6.5 | Settings page works | `/dashboard/settings` loads | [ ] |
| 6.6 | Can change password | Old password required, new password works | [ ] |

---

## 7. Admin Dashboard

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 7.1 | Home page stats | Shows counts: requests, vendors, etc. | [ ] |
| 7.2 | Requests page | Filter, search, pagination work | [ ] |
| 7.3 | Vendors page | Can add, edit, change status | [ ] |
| 7.4 | Applications page | Search works, approve/reject work | [ ] |
| 7.5 | Landlords page | Search works, shows request counts | [ ] |
| 7.6 | Analytics page | Charts and stats display | [ ] |

---

## 8. Edge Cases & Error Handling

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 8.1 | Submit request with missing fields | Validation errors shown | [ ] |
| 8.2 | Submit review without rating | Error message | [ ] |
| 8.3 | Access `/dashboard` when logged out | Redirect to login | [ ] |
| 8.4 | Access admin pages as landlord | Redirect to login with error | [ ] |
| 8.5 | Vendor applies with existing vendor email | Error: "already exists" | [ ] |
| 8.6 | Upload file > 10MB | Error message | [ ] |

---

## 9. Cron Jobs

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 9.1 | `/api/cron/follow-up` | Sends follow-ups for 3-5 day old matches | [ ] |
| 9.2 | `/api/cron/update-scores` | Recalculates all vendor scores | [ ] |
| 9.3 | Cron auth works | Requires CRON_SECRET bearer token | [ ] |

---

## Test Data Cleanup

After testing, clean up:
- [ ] Delete test requests
- [ ] Delete test landlord accounts
- [ ] Reset test vendor scores if needed

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |
