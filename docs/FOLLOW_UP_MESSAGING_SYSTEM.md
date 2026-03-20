# Follow-Up Messaging System — Product Requirements Document

## 1. Problem Statement

After matching a landlord with up to 3 vendors, we send a single follow-up 3–5 days later. This gives us almost no visibility into what happens between introduction and outcome. We can't tell if vendors called, if estimates were given, if jobs happened, or if anyone ghosted.

**What we lose:** Revenue (can't invoice referral fees without outcome data), quality signal (vendor scores rely on sparse reviews), intervention timing (stalled matches go unnoticed), landlord trust (no one checks in), vendor accountability (ghosting has no consequences).

## 2. Goal

Replace the single-touch follow-up with a structured, multi-touch sequence that tracks the landlord–vendor interaction from introduction to resolution. Channels: email (Resend) + SMS (Telnyx). The system should maximize data collection, detect stalls early, feed vendor scoring, and minimize friction for both sides.

---

## 3. How Smart Match Works Today

When a request comes in, the system scores every active vendor using 8 weighted factors: service type match (25%), location/zip code proximity (20%), vendor performance score from past reviews (15%), average response time (10%), urgency/availability fit (10%), specialty match (10%), current workload capacity (5%), and budget-to-price-range fit (5%). Each factor produces a 0–100 score; the weighted total determines an overall match score. Vendors scoring 65+ are flagged as "recommended," with a confidence level (high/medium/low) based on how much data is available. The system ranks all eligible vendors and suggests the top 3 to the admin, who can approve, override, or swap before sending introductions.

---

## 4. Post-Match Interaction Lifecycle

Each stage is a data collection opportunity.

```
INTRODUCTION SENT
       │
       ▼
┌─────────────┐
│  FIRST       │   Did the vendor contact the landlord?
│  CONTACT     │   Did the landlord respond?
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ESTIMATE /  │   Was an estimate or quote provided?
│  ASSESSMENT  │   Did they schedule a site visit?
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DECISION    │   Did the landlord choose this vendor?
│              │   If not, why?
└──────┬──────┘
       │
       ├──── NO  ──► CLOSED (capture reason)
       │
       ▼
┌─────────────┐
│  JOB IN      │   Is work underway?
│  PROGRESS    │   Expected completion date?
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  JOB         │   Was the job completed satisfactorily?
│  COMPLETED   │   Final cost?
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  REVIEW &    │   Landlord review (quality, price, timeline, treatment)
│  PAYMENT     │   Referral fee invoicing trigger
└─────────────┘
```

---

## 5. Messaging Sequence

### 4.1 Overview

| Touch | Timing | Target | Channel | Purpose |
|-------|--------|--------|---------|---------|
| T0 | Match time | Both | Email + SMS | Introduction (exists today) |
| T1 | +24h | Vendor | SMS | Confirm vendor received lead |
| T2 | +48h | Landlord | SMS | Check if vendor made contact |
| T3 | +4 days | Both | Email | Status check with one-click buttons |
| T4 | +7 days | Landlord | SMS | Estimate/decision check |
| T5 | +10 days | Both | Email | Stalled match intervention |
| T6 | Event-driven | Landlord | Email + SMS | Job started confirmation |
| T7 | Due date +1 day | Landlord | SMS | Job completion check |
| T8 | On completion | Both | Email + SMS | Review request + payment trigger |
| T9 | T8 +3 days | Landlord | SMS | Review reminder |
| T10 | T8 +7 days | Landlord | Email | Final review nudge |

**Key principle:** The sequence is event-driven. Each response (or non-response) determines the next message. If a landlord reports "no one called" at T2, we branch into intervention — we don't keep asking the same thing.

**Emergency requests** compress timing: T1 at +4h, T2 at +12h, T3 at +2 days, T4 at +3 days.

### 4.2 Touch Details

**T1 — Vendor Lead Confirmation (+24h, SMS to each vendor)**
> "Have you reached out to them yet? Reply: YES / NOT YET / PASS"
- YES → log contact, continue sequence
- NOT YET → nudge at +48h ("fast response increases your chances")
- PASS → mark `vendor_declined`, alert admin. If all 3 pass → re-match
- No reply by +48h → flag `no_response`, impacts vendor score

**T2 — Landlord Contact Check (+48h, SMS to landlord)**
> "Has anyone reached out to you yet? Reply: YES / NO"
- YES → continue sequence
- NO → cross-reference with T1: if vendor said YES → flag discrepancy for admin; if vendors unresponsive → priority nudge or re-match
- No reply → proceed to T3

**T3 — Status Check (+4 days, email to both)**
Skip if landlord already confirmed contact. Emails contain one-click status buttons (tracked links).

*Landlord options:* "A vendor contacted me" / "No one reached out" / "Already chosen a vendor" / "No longer need this"

*Vendor options:* "I contacted the landlord" / "I sent an estimate" / "Can't take this job" / "Couldn't reach the landlord"

Key branches: "No contact" → admin alert + supplemental match. "Chosen a vendor" → advance to T6. "Estimate sent" → pipeline advancement. Conflicting stories → discrepancy flag.

**T4 — Estimate & Decision Check (+7 days, SMS to landlord)**
Skip if already cancelled or vendor chosen.
> "Have you received any estimates? Reply: YES / NO / CANCELLED"
- YES → follow-up asking which vendor they chose
- NO → admin review (potential quality/mismatch issue)

**T5 — Stalled Match Intervention (+10 days, email to both)**
Only fires if no positive progress recorded. Personal tone, from "the Real Landlording team."

*Landlord options:* "Still working with vendors" / "Want different vendors" (→ re-match) / "Handled it on my own" (→ capture who they used) / "No longer need this"

*Vendor options:* "Job in progress" / "Landlord chose someone else" / "Couldn't reach landlord" / "Estimate too high" / "Scope wasn't a fit"

**T6 — Job Started (event-driven, email + SMS to landlord)**
Fires when `job_won = true`. Asks for expected completion date. Sets expectation: "We'll check in after."

**T7 — Job Completion Check (due date +1 day, SMS to landlord)**
> "Is the work done? Reply: DONE / IN PROGRESS / PROBLEM"
- DONE → advance to T8
- IN PROGRESS → re-check in 3 days
- PROBLEM → route to admin immediately

**T8 — Review Request & Payment Trigger (on completion, email + SMS)**
*To landlord:* Star rating via one-click links (1–5), sub-ratings (quality, price, timeline, professionalism), "Would you hire again?", "Price close to estimate?"

*To vendor:* Request final cost, job notes, "Want similar leads?" Remind about referral fee terms.

**Payment trigger:** `job_completed = true` + vendor reports cost → auto-create referral payment record.

**T9 — Review Reminder (T8 +3 days, SMS)** and **T10 — Final Review Nudge (T8 +7 days, email)**
Progressively simpler asks. After T10: mark `review_status = skipped`, stop messaging for this request.

---

## 6. SMS Reply Handling & Email Tracking

### Inbound SMS (Telnyx webhook)
1. Match sender phone + recent outbound to identify conversation context
2. Parse against keyword map (case-insensitive):

| Keywords | Meaning |
|----------|---------|
| YES, Y, YEP, YEAH | Affirmative |
| NO, N, NOPE, NAH | Negative |
| PASS, SKIP, DECLINE | Vendor declining |
| DONE, COMPLETE, FINISHED | Job completed |
| PROBLEM, ISSUE, HELP | Escalation |
| CANCEL, CANCELLED | Cancellation |
| 1–5 | Star rating |
| Anything else | Free-text → admin queue |

3. Auto-acknowledge receipt. STOP → immediate opt-out, fall back to email-only.

### Email One-Click Buttons
Status buttons in T3/T5 and star ratings in T8 are tracked links hitting `GET /api/follow-up/respond?token={encrypted_token}`. Token decodes to `{ request_id, vendor_id, touch_id, response_value }`. User lands on a confirmation page with optional detail form.

---

## 7. Sequence Rules

| Rule | Detail |
|------|--------|
| No double-messaging | Never SMS + email same day for same touch (except T0, T8) |
| Respect silence | 3 consecutive no-responses → stop automation, route to admin |
| Business hours | SMS: 9 AM – 7 PM ET only. Email: anytime. |
| One landlord sequence | Per request, not per vendor. Vendor sequences are per-vendor. |
| Suppression | Skip if: request completed/cancelled, data already captured, within 12h of last message, channel opted out |
| Termination | Request reaches `completed`/`cancelled`, or T10 sent |

**Admin controls:** Pause, resume, skip to any touch, add manual notes, trigger re-match.

---

## 8. Vendor Data Collection & Scoring

Vendors are an underutilized data source. This system collects structured feedback at T1, T3, T5, and T8.

| Data Point | When | Business Value |
|------------|------|---------------|
| Reached out to landlord? | T1 | Responsiveness metric |
| Response time | T1 | Speed-to-lead scoring |
| Sent estimate? | T3 | Pipeline signal |
| Decline reason | T1, T3 | Job-fit analysis |
| Loss reason | T5 | Pricing/quality signal |
| Final cost | T8 | Referral fee basis + market rate data |
| Want similar leads? | T8 | Matching preference |
| Could they reach landlord? | T3, T5 | Landlord responsiveness signal |

**Scoring impact:** Positive signals — acknowledged lead within 24h, contacted within 48h, sent estimate, completed job, "would hire again." Negative signals — ghosted lead, "would not hire again," consistently unresponsive. Neutral — declined with a reason (honesty valued).

---

## 9. Admin Dashboard Enhancements

**Sequence Timeline View** — Per-request visual timeline of every touch, response, gap, and discrepancy.

**Intervention Queue** (prioritized):
1. Discrepancy detected (vendor/landlord stories conflict)
2. Problem reported (T7 PROBLEM reply)
3. Silence threshold hit (3+ no-responses)
4. All vendors declined (no active vendors)
5. Overdue job (past expected completion)
6. High-value stall (emergency request not progressing)

**Analytics funnel:**
```
Matched → Contacted → Estimate → Vendor Chosen → Completed → Reviewed → Payment Collected
```

**Key metrics:** Avg time to first contact, stall/decline/cancellation reasons, SMS vs email response rates, price-vs-estimate accuracy, "would hire again" rate, avg job cost by service type.

**Vendor Report Card** (monthly): Leads received, response rate/time, jobs won/lost, avg review, "would hire again" %, category comparison.

---

## 10. Compliance

**SMS (TCPA/10DLC):** Prior express consent at request submission / vendor onboarding. STOP keyword → immediate opt-out. Frequency disclosed at opt-in ("up to 10 messages per request"). 10DLC registration with Telnyx.

**Email (CAN-SPAM):** Physical address in footer, unsubscribe link in every email, instant processing via webhook. Follow-up emails are transactional but include unsubscribe as best practice.

**Retention:** Touch records 3 years, raw SMS 1 year then anonymized, opt-out records indefinitely.

---

## 11. Phased Rollout

| Phase | Weeks | Scope |
|-------|-------|-------|
| A — Foundation | 1–3 | `follow_up_touches` + `follow_up_sequences` tables. T1 + T2 via SMS. Replace current cron. Basic admin timeline. |
| B — Full Sequence | 4–6 | T3–T5 emails. Telnyx inbound webhook + reply parsing. Email click tracking. Admin pause/resume/skip. |
| C — Completion | 7–9 | T6–T10. One-click star ratings. Payment trigger. Vendor data at T8. |
| D — Intelligence | 10–12 | Dashboard widgets + funnel analytics. Intervention queue. Vendor report cards. A/B test framework. |

---

## 12. Success Metrics

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| Landlord response rate | ~15% | 60%+ |
| Vendor response rate | Not tracked | 70%+ |
| Jobs with known outcome | ~20% | 80%+ |
| Review submission rate | ~5% | 35%+ |
| Time to detect stalled match | 10+ days | 48 hours |
| Referral fee collection with cost data | Ad hoc | 90%+ of completed jobs |
| Data points per request lifecycle | ~3 | 12+ |

---

## 13. Open Questions

1. **Telnyx setup** — Short code vs 10DLC long code for our volume?
2. **Reply parsing** — Keyword matching first, add LLM parsing in Phase D? (Recommended)
3. **Landlord accounts** — Nudge account creation harder? Account holders get self-service status page.
4. **Vendor terms** — Make T1 response contractually expected to justify scoring penalties?
5. **Tone** — "Real Landlording" vs named team member ("Sarah from Real Landlording")?
6. **Loser notification** — Notify non-selected vendors when landlord picks one? (Recommended: yes)

