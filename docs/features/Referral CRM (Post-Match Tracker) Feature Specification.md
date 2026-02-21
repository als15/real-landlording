# **Feature: Referral Lifecycle CRM (Post-Match Tracker)**

## **Purpose**

Create an internal CRM view to manage the full lifecycle of each referral after vendor matching.

This replaces the interim Excel export and acts as:

* Operational tracker

* Commission follow-up tool

* Job status monitor

* Manual system of record

This feature will later integrate with automated follow-up workflows.

---

# **Core Concept**

Each **matched vendor per request** becomes one **Referral Record**.

One row \= one contractor matched to one request.

---

# **1\. Data Model (Referral Record)**

Each record must contain:

### **A. Contractor**

* Text

* Vendor name

* Default: “Unassigned” if not yet matched

### **B. Landlord**

* Landlord Name (text)

* Landlord Email (text)

* Landlord Phone (text)

### **C. Property**

* Property Address (text)

### **D. Project Type (Derived – Auto Generated)**

Single text field built from:

* Service Type

* Service Needed

* Finish Level (if applicable)

This must be auto-populated from request data.  
 No manual editing required.

### **E. Date Referred**

* Date field

* Auto-filled when match intro is sent

### **F. Status (Required – Core Field)**

Single-select dropdown.  
 Exact allowed values:

* Referred

* Estimate Sent

* Work in Progress

* Offer Accepted

* Declined by the Landlord

* Declined by Contractor

* No Response

* Commission Paid

Rules:

* Dropdown only

* One status per referral

* Default \= Referred

This field drives:

* Follow-up logic

* Commission tracking

* Filtering views

### **G. Expected Due**

* Date field

* Editable

* Used for job completion follow-up

### **H. Notes**

* Free text

* For operational comments

* Examples:

  * “Job completed 2/3 – following up for commission”

  * “LL asked to pause until March”

  * “Waiting on contractor invoice”

Must allow ongoing edits.

---

# **2\. Core Functionality**

## **A. Referral List View**

Admin view with:

* Table layout

* Sortable columns

* Filter by:

  * Status

  * Contractor

  * Date Referred

  * Expected Due

Must support:

* Quick inline status change

* Quick edit of Expected Due

* Notes editing

This is a working operations board, not reporting-only.

---

## **B. Basic Operational Filters (Required)**

Saved filters:

1. “Needs Follow-Up”

   * Status \= Referred

   * OR Status \= Estimate Sent

   * OR Status \= Work in Progress

2. “Commission Pending”

   * Status \= Offer Accepted

   * OR Status \= Work in Progress

3. “Overdue Jobs”

   * Expected Due \< Today

   * AND Status ≠ Commission Paid

4. “Closed”

   * Status \= Commission Paid

   * OR Declined by Landlord

   * OR Declined by Contractor

   * OR No Response

---

## **C. Manual Workflow (Current Phase)**

Admin manually:

* Updates Status

* Updates Expected Due

* Adds Notes

* Uses filters for follow-up

No automation required at this stage.

---

# **3\. Future Automation Readiness (Important)**

Structure must allow:

* Automated status updates (e.g., when vendor confirms estimate)

* Automated follow-up triggers based on:

  * Status

  * Expected Due

  * Days since Date Referred

* Commission payment triggers

* Vendor performance scoring integration

The CRM should not rely on free-text logic.

Status must remain structured and clean.

---

# **4\. Export Capability**

Must allow:

* CSV export

* One row per referral

* All columns included

* Clean, migration-ready format

This ensures portability and auditability.