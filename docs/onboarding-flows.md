# User Onboarding Flows

## Landlord Flow

### Submitting a Request (No Account Required)

1. **Landlord visits** `/request`
2. **Fills out form** - service type, property details, job description
3. **Submits request** → System creates:
   - Service request record
   - Basic landlord profile (if new email)
4. **Receives email** - "Request Received" with tracking link
5. **Optional signup nudge** - Create account to track requests

### Creating an Account

1. **Landlord visits** `/auth/signup`
2. **Fills out form** - name, email, password
3. **Receives verification email** → clicks link
4. **Redirected to login** → signs in
5. **Dashboard access** - Can view all requests submitted with that email

### After Match

1. **Receives email** - "Your Vendors Are Ready" with vendor contact info
2. **Contacts vendors** directly to discuss project
3. **After job completion** - Can leave review via dashboard

---

## Vendor Flow

### Applying to Join

1. **Vendor visits** `/vendor/apply`
2. **Fills out application** - business info, services, service areas
3. **Submits application** → Status: `pending_review`
4. **Receives email** - "Application Received" with link to Vendor Portal

### Getting Approved

1. **Admin approves** application in admin dashboard
2. **System creates** auth account with temp password
3. **Vendor receives email** - "You're Approved" with:
   - Login credentials (email + temp password)
   - Link to Vendor Portal
4. **Vendor logs in** at `/vendor/login`
5. **Should change password** after first login

### Receiving Job Referrals

1. **Admin matches** vendor to a landlord request
2. **Vendor receives email** - "New Project Referral" with:
   - Client contact info (name, phone, email)
   - Project details
   - Property address
3. **Vendor contacts landlord** directly
4. **Completes job** → Landlord leaves review

### Password Recovery

1. **Vendor visits** `/vendor/login`
2. **Clicks** "Forgot Password?"
3. **Enters email** → receives reset link
4. **Sets new password** → can log in

---

## Admin Flow

### Accessing Admin Dashboard

1. **Admin visits** `/login` (admin login)
2. **Signs in** with admin credentials
3. **Dashboard access** - Full platform management

### Managing Requests

1. **View requests** at `/requests`
2. **Select request** → Click "Match Vendors"
3. **System suggests** matching vendors based on:
   - Service type
   - Service area (zip code)
   - Vendor status (active only)
4. **Admin selects** up to 3 vendors
5. **Confirms match** → Emails sent to:
   - Landlord (vendor contact info)
   - Each vendor (job details)

### Managing Vendor Applications

1. **View applications** at `/applications`
2. **Review application** details
3. **Approve or Reject**:
   - **Approve** → Creates auth account, sends welcome email
   - **Reject** → Sends rejection email

### Managing Vendors

1. **View vendors** at `/vendors`
2. **Can edit** vendor details, status, service areas
3. **Can deactivate** vendors (removes from matching pool)

---

## Email Summary

| Trigger | Recipient | Email |
|---------|-----------|-------|
| Request submitted | Landlord | "Request Received" |
| Vendor matched | Landlord | "Your Vendors Are Ready" |
| Vendor matched | Vendor | "New Project Referral" |
| Follow-up (3-5 days) | Landlord | "How did it go?" |
| Application submitted | Vendor | "Application Received" |
| Application approved | Vendor | "You're Approved" + credentials |
| Application rejected | Vendor | "Application Update" |
| No vendors available | Landlord | "Update on Your Request" |
