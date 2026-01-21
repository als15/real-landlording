# PandaDoc Migration Plan

## Overview

Replace DocuSign with PandaDoc for vendor SLA document signing.

## PandaDoc vs DocuSign Comparison

| Feature | DocuSign | PandaDoc |
|---------|----------|----------|
| Auth | JWT + RSA key (complex) | API Key (simple) |
| Create doc | POST /envelopes | POST /documents |
| Send doc | Auto on create | Separate POST /documents/{id}/send |
| Status webhook | envelope-sent, envelope-completed | document_state_changed |
| Dynamic fields | Text Tabs (tabLabel) | Tokens + Fields |
| Pricing | ~$40-50/mo API | ~$19-35/mo (cheaper) |

## PandaDoc API Flow

```
1. Create Document (POST /documents)
   - Uses template_uuid
   - Passes tokens for dynamic text (vendor_name, commission_rate)
   - Returns document.uploaded status

2. Wait for Draft Status (3-5 seconds)
   - Poll GET /documents/{id} OR
   - Use webhook for document_state_changed

3. Send Document (POST /documents/{id}/send)
   - Transitions to document.sent
   - Email sent to recipient

4. Track via Webhooks
   - document_state_changed → status updates
   - document_completed_pdf_ready → ready to download
```

## Environment Variables

### Remove (DocuSign)
```
DOCUSIGN_INTEGRATION_KEY
DOCUSIGN_USER_ID
DOCUSIGN_ACCOUNT_ID
DOCUSIGN_RSA_PRIVATE_KEY
DOCUSIGN_BASE_PATH
DOCUSIGN_OAUTH_BASE_PATH
DOCUSIGN_SLA_TEMPLATE_ID
DOCUSIGN_SLA_ROLE_NAME
DOCUSIGN_WEBHOOK_SECRET
```

### Add (PandaDoc)
```
PANDADOC_API_KEY=your_api_key
PANDADOC_SLA_TEMPLATE_ID=your_template_uuid
PANDADOC_WEBHOOK_SECRET=optional_webhook_secret
```

## Database Changes

**No schema changes needed** - reuse existing columns:
- `sla_envelope_id` → stores PandaDoc document ID
- `sla_status` → map PandaDoc statuses to existing values
- `sla_sent_at` → when document was sent
- `sla_signed_at` → when document was completed
- `sla_document_url` → link to signed document

### Status Mapping

| PandaDoc Status | Our sla_status |
|-----------------|----------------|
| document.uploaded | not_sent |
| document.draft | not_sent |
| document.sent | sent |
| document.viewed | viewed |
| document.waiting_approval | sent |
| document.completed | signed |
| document.voided | voided |
| document.declined | declined |

## Files to Modify

### 1. Create new PandaDoc client
**File:** `src/lib/pandadoc/client.ts`
```typescript
- pandadocFetch() helper with API key auth
- Simple header: Authorization: API-Key {key}
```

### 2. Create SLA functions
**File:** `src/lib/pandadoc/sla.ts`
```typescript
- sendSlaToVendor() - create + send document
- getSlaStatus() - get document status
- voidSlaDocument() - void/cancel document
- resendSlaNotification() - resend email
```

### 3. Update webhook handler
**File:** `src/app/api/webhooks/pandadoc/route.ts`
```typescript
- Handle document_state_changed event
- Handle document_completed_pdf_ready event
- Update vendor sla_status in database
```

### 4. Update exports
**File:** `src/lib/pandadoc/index.ts`
```typescript
- Export all PandaDoc functions
- isPandaDocConfigured() check
```

### 5. Update approval flow
**File:** `src/app/api/admin/applications/[id]/approve/route.ts`
```typescript
- Change import from docusign to pandadoc
- sendSlaToVendor() signature stays same
```

### 6. Update vendor SLA routes
**Files:**
- `src/app/api/admin/vendors/[id]/send-sla/route.ts`
- `src/app/api/admin/vendors/[id]/resend-sla/route.ts`

### 7. Remove DocuSign code (after testing)
**Files to delete:**
- `src/lib/docusign/client.ts`
- `src/lib/docusign/sla.ts`
- `src/lib/docusign/index.ts`
- `src/app/api/webhooks/docusign/route.ts`

## PandaDoc Template Setup

1. Create template in PandaDoc
2. Add text fields with these token names:
   - `vendor_name` - Vendor's contact name
   - `business_name` - Vendor's business name
   - `commission_rate` - Commission percentage (for future use)
3. Add signature field assigned to "Vendor" role
4. Add date field for signature date
5. Copy template UUID to `PANDADOC_SLA_TEMPLATE_ID`

## Implementation Steps

### Phase 1: Create PandaDoc Integration
- [ ] Create `src/lib/pandadoc/client.ts`
- [ ] Create `src/lib/pandadoc/sla.ts`
- [ ] Create `src/lib/pandadoc/index.ts`
- [ ] Add environment variables

### Phase 2: Create Webhook Handler
- [ ] Create `src/app/api/webhooks/pandadoc/route.ts`
- [ ] Test webhook with PandaDoc

### Phase 3: Update Application Flow
- [ ] Update approve route to use PandaDoc
- [ ] Update send-sla route
- [ ] Update resend-sla route

### Phase 4: Testing
- [ ] Test document creation
- [ ] Test document sending
- [ ] Test webhook status updates
- [ ] Test with real vendor approval

### Phase 5: Cleanup
- [ ] Remove DocuSign code
- [ ] Remove DocuSign env vars
- [ ] Update documentation

## PandaDoc API Examples

### Create Document
```typescript
const response = await fetch('https://api.pandadoc.com/public/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': `API-Key ${PANDADOC_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: `SLA - ${vendor.businessName}`,
    template_uuid: PANDADOC_SLA_TEMPLATE_ID,
    recipients: [
      {
        email: vendor.email,
        first_name: vendor.contactName.split(' ')[0],
        last_name: vendor.contactName.split(' ').slice(1).join(' ') || '',
        role: 'Vendor',
      }
    ],
    tokens: [
      { name: 'vendor_name', value: vendor.contactName },
      { name: 'business_name', value: vendor.businessName },
      { name: 'commission_rate', value: vendor.commissionRate || '10' },
    ],
    metadata: {
      vendor_id: vendor.vendorId,
    },
  }),
});
```

### Send Document
```typescript
const response = await fetch(`https://api.pandadoc.com/public/v1/documents/${documentId}/send`, {
  method: 'POST',
  headers: {
    'Authorization': `API-Key ${PANDADOC_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Please review and sign your Real Landlording vendor agreement.',
    subject: 'Your Real Landlording Vendor Agreement',
  }),
});
```

### Webhook Payload (document_state_changed)
```json
{
  "event": "document_state_changed",
  "data": {
    "id": "abc123",
    "name": "SLA - Acme Plumbing",
    "status": "document.completed",
    "date_completed": "2024-01-15T10:30:00Z",
    "metadata": {
      "vendor_id": "vendor-uuid-here"
    },
    "recipients": [
      {
        "email": "vendor@example.com",
        "has_completed": true,
        "signature_date": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

## Notes

- PandaDoc documents need ~3-5 seconds after creation before they can be sent
- Use polling or webhooks to wait for `document.draft` status
- Metadata field stores vendor_id for webhook correlation
- Keep DocuSign code until PandaDoc is fully tested
