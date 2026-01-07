import { docusignFetch, mapEnvelopeStatusToSlaStatus, type SlaStatus } from './client';

const DOCUSIGN_SLA_TEMPLATE_ID = process.env.DOCUSIGN_SLA_TEMPLATE_ID!;
const DOCUSIGN_SLA_ROLE_NAME = process.env.DOCUSIGN_SLA_ROLE_NAME || 'Vendor';

export interface VendorSlaData {
  vendorId: string;
  contactName: string;
  businessName: string;
  email: string;
}

export interface SendSlaResult {
  success: boolean;
  envelopeId?: string;
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
 */
export async function sendSlaToVendor(vendor: VendorSlaData): Promise<SendSlaResult> {
  try {
    console.log('[DocuSign] Sending SLA to vendor:', {
      vendorId: vendor.vendorId,
      email: vendor.email,
      contactName: vendor.contactName,
      businessName: vendor.businessName,
      templateId: DOCUSIGN_SLA_TEMPLATE_ID,
      roleName: DOCUSIGN_SLA_ROLE_NAME,
    });

    // Create envelope from template
    const envelopeDefinition = {
      templateId: DOCUSIGN_SLA_TEMPLATE_ID,
      status: 'sent',
      templateRoles: [
        {
          roleName: DOCUSIGN_SLA_ROLE_NAME,
          name: vendor.contactName,
          email: vendor.email,
          tabs: {
            textTabs: [
              {
                tabLabel: 'vendor_name',
                value: vendor.contactName,
              },
              {
                tabLabel: 'business_name',
                value: vendor.businessName,
              },
            ],
          },
        },
      ],
      customFields: {
        textCustomFields: [
          {
            name: 'vendor_id',
            value: vendor.vendorId,
            show: 'false',
          },
        ],
      },
    };

    console.log('[DocuSign] Envelope definition:', JSON.stringify(envelopeDefinition, null, 2));

    const response = await docusignFetch('/envelopes', {
      method: 'POST',
      body: JSON.stringify(envelopeDefinition),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[DocuSign] API error response:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.message || `DocuSign API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      envelopeId: data.envelopeId,
    };
  } catch (error) {
    console.error('[DocuSign] Error sending SLA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending SLA',
    };
  }
}

/**
 * Get the status of an SLA envelope
 */
export async function getSlaStatus(envelopeId: string): Promise<SlaStatusResult> {
  try {
    const response = await docusignFetch(`/envelopes/${envelopeId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `DocuSign API error: ${response.status}`);
    }

    const envelope = await response.json();

    const result: SlaStatusResult = {
      success: true,
      status: mapEnvelopeStatusToSlaStatus(envelope.status || 'sent'),
      sentAt: envelope.sentDateTime,
    };

    if (envelope.status === 'completed') {
      result.signedAt = envelope.completedDateTime;
    }

    return result;
  } catch (error) {
    console.error('[DocuSign] Error getting SLA status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting SLA status',
    };
  }
}

/**
 * Void (cancel) an envelope that hasn't been completed
 */
export async function voidSlaEnvelope(envelopeId: string, reason: string): Promise<boolean> {
  try {
    const response = await docusignFetch(`/envelopes/${envelopeId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'voided',
        voidedReason: reason,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[DocuSign] Error voiding envelope:', error);
    return false;
  }
}

/**
 * Resend the signing notification to the vendor
 */
export async function resendSlaNotification(envelopeId: string): Promise<boolean> {
  try {
    console.log('[DocuSign] Resending notification for envelope:', envelopeId);

    // Get recipients first
    const recipientsResponse = await docusignFetch(`/envelopes/${envelopeId}/recipients`);

    if (!recipientsResponse.ok) {
      const errorData = await recipientsResponse.json();
      console.error('[DocuSign] Failed to get recipients:', errorData);
      return false;
    }

    const recipients = await recipientsResponse.json();
    console.log('[DocuSign] Recipients:', JSON.stringify(recipients, null, 2));

    if (recipients.signers && recipients.signers.length > 0) {
      const signer = recipients.signers[0];
      console.log('[DocuSign] Resending to signer:', signer.recipientId, signer.email);

      // Use the resend query parameter approach instead
      const resendResponse = await docusignFetch(
        `/envelopes/${envelopeId}/recipients?resend_envelope=true`,
        {
          method: 'PUT',
          body: JSON.stringify({
            signers: [
              {
                recipientId: signer.recipientId,
                name: signer.name,
                email: signer.email,
              },
            ],
          }),
        }
      );

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        console.error('[DocuSign] Failed to resend:', errorData);
        return false;
      }

      console.log('[DocuSign] Resend successful');
      return true;
    }

    console.log('[DocuSign] No signers found');
    return false;
  } catch (error) {
    console.error('[DocuSign] Error resending notification:', error);
    return false;
  }
}
