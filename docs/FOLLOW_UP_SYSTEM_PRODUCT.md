# Follow-Up System — Product Overview

## What It Does

After an admin introduces a landlord to a vendor, the follow-up system automatically checks in with both parties to track whether the job moves forward, gets completed, collects invoice data for revenue tracking, and gathers feedback. It replaces manual follow-up emails with a structured, automated flow.

---

## Design Principles

**Vendor = source of truth.** All key data — status, conversion, completion, payment — comes from the vendor. They're closest to the work.

**Landlord = experience.** Keep landlord touches minimal and valuable. Landlords only provide validation (when needed) and feedback.

### Five Milestones

Every follow-up tracks a match through these five checkpoints:

| #   | Milestone      | What We're Checking     | If It Fails       |
| --- | -------------- | ----------------------- | ----------------- |
| 1   | **Contact**    | Did they engage?        | Push engagement   |
| 2   | **Conversion** | Did it turn into a job? | Possible rematch  |
| 3   | **Completion** | Did the job finish?     | Track timeline    |
| 4   | **Feedback**   | Was it good?            | Landlord feedback |
| 5   | **Payment**    | Did money happen?       | Capture invoice   |

### Messaging Rules

- **Send only when needed**, not on a fixed schedule. Fewer messages = higher response rate.
- **Use structured answers** (buttons: 1, 2, 3, 4), not free text. Exception: invoice value.
- **Every flow leads to capturing payment.** Monetization is the goal — the system isn't done until we know the invoice value.

---

## The Flow

Everything starts when an admin sends an intro email. From there, the system runs on autopilot:

```
 INTRO SENT (Day 0)
     │
     │  Immediately
     ▼
 ┌──────────────────────────────────────────┐
 │  Step 0: MESSAGE TO LANDLORD             │
 │  "We matched you with a vendor. They     │
 │   should reach out shortly. If not,      │
 │   we'll step in."                        │
 └──────────────┬───────────────────────────┘
                │
                │  (3 days later)
                ▼
 ┌──────────────────────────────────────────┐
 │  Step 1: MESSAGE TO VENDOR               │
 │  "What's the status?"                    │
 │                                          │
 │  ○ 1. Job Booked              ───────────┼──── Step 1.1
 │  ○ 2. Still Discussing        ───────────┼──── Step 3 (Day 7)
 │  ○ 3. Couldn't Reach Landlord ───────────┼──── Step 2 (Day 4)
 │  ○ 4. Not Moving Forward      ───────────┼──── CLOSED + admin alert
 └──────────────────────────────────────────┘

 ┌──── Step 1.1: VENDOR (immediate, if "Job Booked") ──────────┐
 │  "When will the job be completed?"                           │
 │  ○ 1. 1–2 days                                              │
 │  ○ 2. 3–5 days                                              │
 │  ○ 3. 1–2 weeks                                             │
 │  ○ 4. Longer                                                │
 │                                                              │
 │  Sets expected completion date ──► Step 4 (wait)             │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 2: LANDLORD (Day 4, if vendor "can't reach") ──────┐
 │  "Did the vendor reach out?"                                 │
 │  ○ 1. Yes  ──► back to monitoring (re-ask vendor Day 7)     │
 │  ○ 2. No   ──► CLOSED + admin alert → rematch               │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 3: VENDOR (Day 7, if "still discussing") ──────────┐
 │  "Did this turn into a job?"                                 │
 │  ○ 1. Yes  ──► Step 1.1 (ask completion timeline)           │
 │  ○ 2. No   ──► CLOSED + admin alert → rematch               │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 4: SYSTEM (wait period) ───────────────────────────┐
 │  No messages sent. Wait until expected completion date.      │
 │  Avoid noise while vendor is working.                        │
 └──────────────────────────────────┬───────────────────────────┘
                                    │
                                    │  (7 days after expected completion)
                                    ▼
 ┌──── Step 5: VENDOR (completion check) ──────────────────────┐
 │  "Is the job complete?"                                      │
 │  ○ 1. Completed       ──► Step 5A                           │
 │  ○ 2. Still In Progress ──► Step 5B                         │
 │  ○ 3. Cancelled       ──► Step 5C                           │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 5A: VENDOR (immediate, if "Completed") ────────────┐
 │  "What was the invoice value?"                               │
 │  Free-text or preset ranges                                  │
 │  ──► Calculate referral fee ──► Step 6 (landlord feedback)   │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 5B: VENDOR (immediate, if "Still In Progress") ────┐
 │  "When will it be completed?"                                │
 │  ○ 1. 1–2 days                                              │
 │  ○ 2. 3–5 days                                              │
 │  ○ 3. 1–2 weeks                                             │
 │  ○ 4. Longer                                                │
 │  ──► Reset expected completion ──► Loop back to Step 4       │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 5C: VENDOR (immediate, if "Cancelled") ────────────┐
 │  "What was the reason?"                                      │
 │  ○ 1. Price                                                  │
 │  ○ 2. Scope                                                  │
 │  ○ 3. Chose Another Vendor                                   │
 │  ○ 4. Other                                                  │
 │  ──► Store reason ──► Offer rematch to landlord              │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 6: LANDLORD (same day as completion) ──────────────┐
 │  "How was your experience?"                                  │
 │  ○ 1. Great                                                  │
 │  ○ 2. OK                                                     │
 │  ○ 3. Not Good                                               │
 │  ──► Store feedback ──► Step 7                               │
 └──────────────────────────────────────────────────────────────┘

 ┌──── Step 7: SYSTEM (end) ───────────────────────────────────┐
 │  All data collected. Close loop.                             │
 │  Store results, update vendor score, calculate revenue.      │
 └──────────────────────────────────────────────────────────────┘
```

---

## Complete Step & Message Reference

| Step    | Timing                           | Who      | Trigger                              | Message (Send This)                                                                                             | Channel      | Goal               | Next Action                              |
| ------- | -------------------------------- | -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------ | ------------------ | ---------------------------------------- |
| **0**   | Day 0                            | Landlord | Match created                        | "We matched you with a vendor. They should reach out shortly. If not, we'll step in."                           | Email + SMS  | Set expectation    | None                                     |
| **1**   | Day 3                            | Vendor   | Always                               | "What's the status?" — 1. Job booked / 2. Still discussing / 3. Couldn't reach landlord / 4. Not moving forward | Email + SMS  | Detect activity    | Route flow                               |
| **1.1** | Immediate                        | Vendor   | "Job booked"                         | "When will the job be completed?" — 1. 1–2 days / 2. 3–5 days / 3. 1–2 weeks / 4. Longer                        | Email        | Set timing         | Schedule completion check → Step 4       |
| **2**   | Day 4                            | Landlord | Vendor said "can't reach"            | "Did the vendor reach out?" — 1. Yes / 2. No                                                                    | Email + SMS  | Validate contact   | Yes → re-ask vendor Day 7 / No → rematch |
| **3**   | Day 7                            | Vendor   | "Still discussing"                   | "Did this turn into a job?" — 1. Yes / 2. No                                                                    | Email + SMS  | Confirm conversion | Yes → Step 1.1 / No → rematch            |
| **4**   | —                                | System   | Job booked + timeline set            | _(no message — quiet period)_                                                                                   | —            | Avoid noise        | Wait until expected completion           |
| **5**   | 7 days after expected completion | Vendor   | Timer expires                        | "Is the job complete?" — 1. Completed / 2. Still in progress / 3. Cancelled                                     | Email + SMS  | Detect outcome     | Branch to 5A/5B/5C                       |
| **5A**  | Immediate                        | Vendor   | "Completed"                          | "What was the invoice value?"                                                                                   | Email (form) | Revenue tracking   | Calculate fee → Step 6                   |
| **5B**  | Immediate                        | Vendor   | "Still in progress"                  | "When will it be completed?" — 1. 1–2 days / 2. 3–5 days / 3. 1–2 weeks / 4. Longer                             | Email        | Reset timing       | Loop to Step 4                           |
| **5C**  | Immediate                        | Vendor   | "Cancelled"                          | "What was the reason?" — 1. Price / 2. Scope / 3. Chose another vendor / 4. Other                               | Email        | Learn + recover    | Offer rematch                            |
| **6**   | Same day as completion           | Landlord | Job completed + invoice collected    | "How was your experience?" — 1. Great / 2. OK / 3. Not good                                                     | Email + SMS  | Quality control    | Store feedback → Step 7                  |
| **7**   | End                              | System   | All data collected                   | _(no message)_                                                                                                  | —            | Close loop         | Store + score                            |
| —       | Immediate                        | Admin    | No deal, no contact, or cancellation | Rematch alert (includes cancellation reason if applicable)                                                      | In-app       | Recovery           | Admin reviews for rematch                |

**Notes:**

- **SMS** = companion message directing recipient to check email for action link. Only sent if phone number is on file.
- **Email buttons** use secure, single-use tokens that expire after 30 days.
- **Step 5A** uses a form input for the dollar amount, not buttons.
- **Step 0** is informational only — no response buttons needed.

---

## How People Respond

Vendors and landlords click buttons directly in the email — no login required. Each button is a secure, single-use link that expires after 30 days.

After clicking, they see a simple confirmation page:

- **"Thanks"** — response recorded
- **"Link expired"** — too much time passed
- **"Link invalid"** — already used or tampered with

For invoice value collection (Step 5A), vendors enter a dollar amount on a simple form page rather than clicking a button.

---

## What Admins See

### CRM Page

Every job in the CRM shows a color-coded follow-up badge:

| Badge Color | Meaning                            |
| ----------- | ---------------------------------- |
| **Green**   | Job booked or completed            |
| **Blue**    | Still in discussion                |
| **Purple**  | Awaiting completion                |
| **Yellow**  | Waiting for a response             |
| **Red**     | Can't reach, no deal, or cancelled |
| **Gray**    | Not started yet                    |

### Admin Overrides

When a vendor or landlord responds by phone or in person (instead of email), admins can manually update the follow-up stage through the admin API. This keeps the data accurate even when communication happens outside the system.

---

## Closed Outcomes

Every follow-up eventually reaches one of these end states:

| Outcome                      | What Happens Next                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **Job completed**            | Invoice value collected → referral fee calculated → landlord gets feedback request |
| **Not moving forward**       | Admin is notified to consider rematching                                           |
| **Can't reach + no contact** | Admin gets a high-priority alert → rematch offered                                 |
| **Job cancelled**            | Cancellation reason stored → rematch offered to landlord                           |

---

## Revenue Tracking

When a vendor reports job completion (Step 5A), the system collects the invoice value. This enables:

- **Referral fee calculation** based on agreed vendor terms
- **Revenue reporting** in the analytics dashboard
- **Vendor leaderboard** ranked by total job value
- **Per-request revenue tracking** for ROI analysis

---

## What's New vs. Previous Version

| Change                    | Before              | After                                                  |
| ------------------------- | ------------------- | ------------------------------------------------------ |
| Day 0 expectation message | None                | Landlord gets "we matched you" message immediately     |
| Completion timing         | Fixed 14-day wait   | Vendor provides expected timeline; check 7 days after  |
| Invoice collection        | Not tracked         | Vendor reports invoice value on completion             |
| Cancellation reasons      | Not tracked         | Vendor selects reason (Price/Scope/Other Vendor/Other) |
| Rematch on cancellation   | Not offered         | System offers rematch to landlord                      |
| Landlord feedback options | Link to review page | 3 simple options: Great / OK / Not Good                |
| Completion re-check       | Fixed 7-day loop    | Vendor provides new timeline, dynamic wait             |

---

## Current Status

The **full enhanced flow is built and feature-flagged off** (`FOLLOW_UP_SYSTEM_ENABLED=false`). All steps (0 through 7) are implemented including:

- Step 0 — Day 0 landlord expectation message
- Step 1.1 / 5B — Dynamic completion timeline (vendor picks duration)
- Step 5A — Invoice value collection (5 preset ranges)
- Step 5C — Cancellation reason collection (4 options)
- Step 6 — Simplified 3-option landlord feedback (Great / OK / Not Good)

**DB migration required:** `029_follow_up_enhanced_flow.sql`

When disabled:

- Follow-up records are still created in the background (data accumulates)
- No emails or SMS are sent
- CRM badges show "Pending" for everything
- Admin can still read/write follow-up data via the API

Turning it on starts the automated emails and response processing. Turning it off again stops all outgoing messages instantly without losing any data.
