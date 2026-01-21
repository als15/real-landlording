import { pandadocFetch, mapDocumentStatusToSlaStatus, waitForDraftStatus, type SlaStatus } from './client';

const PANDADOC_SLA_TEMPLATE_ID = process.env.PANDADOC_SLA_TEMPLATE_ID!;

export interface VendorSlaData {
  vendorId: string;
  contactName: string;
  businessName: string;
  email: string;
  commissionRate?: string; // e.g., "10" for 10%
}

export interface SendSlaResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface SlaStatusResult {
  success: boolean;
  status?: SlaStatus;
  sentAt?: string;
  signedAt?: string;
  documentUrl?: string;
  error?: string;
}

/**
 * Send the SLA document to a vendor for signature
 *
 * PandaDoc flow:
 * 1. Create document from template
 * 2. Wait for document to be in draft status
 * 3. Send document to recipient
 */
export async function sendSlaToVendor(vendor: VendorSlaData): Promise<SendSlaResult> {
  try {
    console.log('[PandaDoc] Sending SLA to vendor:', {
      vendorId: vendor.vendorId,
      email: vendor.email,
      contactName: vendor.contactName,
      businessName: vendor.businessName,
      commissionRate: vendor.commissionRate,
      templateId: PANDADOC_SLA_TEMPLATE_ID,
    });

    // Split name into first/last
    const nameParts = vendor.contactName.trim().split(' ');
    const firstName = nameParts[0] || vendor.contactName;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Build tokens array for dynamic fields
    const tokens = [
      { name: 'vendor_name', value: vendor.contactName },
      { name: 'business_name', value: vendor.businessName },
    ];

    // Add commission rate if provided
    if (vendor.commissionRate) {
      tokens.push({ name: 'commission_rate', value: vendor.commissionRate });
    }

    // Step 1: Create document from template
    const createPayload = {
      name: `Vendor SLA - ${vendor.businessName}`,
      template_uuid: PANDADOC_SLA_TEMPLATE_ID,
      recipients: [
        {
          email: vendor.email,
          first_name: firstName,
          last_name: lastName,
          role: 'Vendor',
        },
      ],
      tokens,
      metadata: {
        vendor_id: vendor.vendorId,
      },
    };

    console.log('[PandaDoc] Create document payload:', JSON.stringify(createPayload, null, 2));

    const createResponse = await pandadocFetch('/documents', {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('[PandaDoc] Create document error:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.detail || errorData.message || `PandaDoc API error: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    const documentId = createData.id || createData.uuid;

    console.log('[PandaDoc] Document created:', documentId, 'Status:', createData.status);

    // Step 2: Wait for document to be ready (draft status)
    const isReady = await waitForDraftStatus(documentId);
    if (!isReady) {
      throw new Error('Document did not become ready for sending in time');
    }

    // Step 3: Send document
    const sendResponse = await pandadocFetch(`/documents/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Please review and sign your Real Landlording vendor agreement. This document outlines our referral partnership terms.',
        subject: 'Real Landlording - Vendor Agreement Ready for Signature',
        silent: false,
      }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      console.error('[PandaDoc] Send document error:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.detail || errorData.message || `Failed to send document: ${sendResponse.status}`);
    }

    const sendData = await sendResponse.json();
    console.log('[PandaDoc] Document sent:', documentId, 'Status:', sendData.status);

    return {
      success: true,
      documentId,
    };
  } catch (error) {
    console.error('[PandaDoc] Error sending SLA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending SLA',
    };
  }
}

/**
 * Get the status of an SLA document
 */
export async function getSlaStatus(documentId: string): Promise<SlaStatusResult> {
  try {
    const response = await pandadocFetch(`/documents/${documentId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || `PandaDoc API error: ${response.status}`);
    }

    const doc = await response.json();

    const result: SlaStatusResult = {
      success: true,
      status: mapDocumentStatusToSlaStatus(doc.status),
      sentAt: doc.date_sent,
    };

    if (doc.status === 'document.completed') {
      result.signedAt = doc.date_completed;
    }

    return result;
  } catch (error) {
    console.error('[PandaDoc] Error getting SLA status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting SLA status',
    };
  }
}

/**
 * Void (cancel) a document that hasn't been completed
 */
export async function voidSlaDocument(documentId: string): Promise<boolean> {
  try {
    // PandaDoc uses status change to void documents
    const response = await pandadocFetch(`/documents/${documentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'document.voided',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[PandaDoc] Void document error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[PandaDoc] Error voiding document:', error);
    return false;
  }
}

/**
 * Resend the signing notification to the vendor
 */
export async function resendSlaNotification(documentId: string): Promise<boolean> {
  try {
    console.log('[PandaDoc] Resending notification for document:', documentId);

    // First get the document to find recipient info
    const docResponse = await pandadocFetch(`/documents/${documentId}`);
    if (!docResponse.ok) {
      console.error('[PandaDoc] Failed to get document for resend');
      return false;
    }

    const doc = await docResponse.json();

    // Check if document is in a state where we can resend
    if (!['document.sent', 'document.viewed'].includes(doc.status)) {
      console.error('[PandaDoc] Document not in sendable state:', doc.status);
      return false;
    }

    // Use the send endpoint again to resend
    const resendResponse = await pandadocFetch(`/documents/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'Reminder: Please review and sign your Real Landlording vendor agreement.',
        subject: 'Reminder: Real Landlording - Vendor Agreement Awaiting Signature',
        silent: false,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('[PandaDoc] Resend error:', errorData);
      return false;
    }

    console.log('[PandaDoc] Resend successful');
    return true;
  } catch (error) {
    console.error('[PandaDoc] Error resending notification:', error);
    return false;
  }
}

/**
 * Get download URL for a completed document
 */
export async function getSignedDocumentUrl(documentId: string): Promise<string | null> {
  try {
    const response = await pandadocFetch(`/documents/${documentId}/download`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.error('[PandaDoc] Failed to get download URL');
      return null;
    }

    // The download endpoint returns the PDF directly, but we want a URL
    // For now, return a link to view in PandaDoc
    return `https://app.pandadoc.com/a/#/documents/${documentId}`;
  } catch (error) {
    console.error('[PandaDoc] Error getting download URL:', error);
    return null;
  }
}
