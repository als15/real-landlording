import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapEnvelopeStatusToSlaStatus } from '@/lib/docusign';
import { sendAdminNotificationEmail } from '@/lib/email/send';

// DocuSign webhook HMAC key for verification (optional but recommended)
const DOCUSIGN_WEBHOOK_SECRET = process.env.DOCUSIGN_WEBHOOK_SECRET;

interface DocuSignWebhookEvent {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: string;
  generatedDateTime: string;
  data: {
    accountId: string;
    userId: string;
    envelopeId: string;
    envelopeSummary?: {
      status: string;
      documentsUri: string;
      recipientsUri: string;
      envelopeUri: string;
      emailSubject: string;
      envelopeId: string;
      customFields?: {
        textCustomFields?: Array<{
          name: string;
          value: string;
        }>;
      };
      recipients?: {
        signers?: Array<{
          email: string;
          name: string;
          status: string;
          signedDateTime?: string;
          declinedDateTime?: string;
          declinedReason?: string;
        }>;
      };
      sentDateTime?: string;
      deliveredDateTime?: string;
      completedDateTime?: string;
      declinedDateTime?: string;
      voidedDateTime?: string;
    };
  };
}

/**
 * Extract vendor ID from envelope custom fields
 */
function getVendorIdFromEnvelope(event: DocuSignWebhookEvent): string | null {
  const customFields = event.data.envelopeSummary?.customFields?.textCustomFields;
  if (!customFields) return null;

  const vendorIdField = customFields.find(f => f.name === 'vendor_id');
  return vendorIdField?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Optional: Verify webhook signature if secret is configured
    if (DOCUSIGN_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-docusign-signature-1');
      // TODO: Implement HMAC verification
      // For now, we'll trust the webhook if it comes to our secret URL
    }

    const event: DocuSignWebhookEvent = JSON.parse(body);
    const envelopeId = event.data.envelopeId;
    const envelopeStatus = event.data.envelopeSummary?.status;

    console.log(`[DocuSign Webhook] Event: ${event.event}, Envelope: ${envelopeId}, Status: ${envelopeStatus}`);

    if (!envelopeId) {
      console.error('[DocuSign Webhook] No envelope ID in event');
      return NextResponse.json({ message: 'Missing envelope ID' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Find vendor by envelope ID
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('id, email, contact_name, business_name')
      .eq('sla_envelope_id', envelopeId)
      .single();

    if (fetchError || !vendor) {
      // Try to get vendor ID from custom fields
      const vendorId = getVendorIdFromEnvelope(event);
      if (vendorId) {
        const { data: vendorById } = await adminClient
          .from('vendors')
          .select('id, email, contact_name, business_name')
          .eq('id', vendorId)
          .single();

        if (!vendorById) {
          console.error(`[DocuSign Webhook] Vendor not found for envelope ${envelopeId}`);
          return NextResponse.json({ message: 'Vendor not found' }, { status: 404 });
        }

        // Update the vendor with the envelope ID if it wasn't set
        await adminClient
          .from('vendors')
          .update({ sla_envelope_id: envelopeId })
          .eq('id', vendorId);
      } else {
        console.error(`[DocuSign Webhook] Vendor not found for envelope ${envelopeId}`);
        return NextResponse.json({ message: 'Vendor not found' }, { status: 404 });
      }
    }

    // Map the envelope status to our SLA status
    const slaStatus = envelopeStatus ? mapEnvelopeStatusToSlaStatus(envelopeStatus) : null;

    // Prepare update data based on event type
    const updateData: Record<string, unknown> = {};

    switch (event.event) {
      case 'envelope-sent':
        updateData.sla_status = 'sent';
        updateData.sla_sent_at = event.data.envelopeSummary?.sentDateTime || new Date().toISOString();
        break;

      case 'envelope-delivered':
        updateData.sla_status = 'delivered';
        break;

      case 'recipient-viewed':
        updateData.sla_status = 'viewed';
        break;

      case 'envelope-completed':
        updateData.sla_status = 'signed';
        updateData.sla_signed_at = event.data.envelopeSummary?.completedDateTime || new Date().toISOString();
        // TODO: Download and store the signed document
        // updateData.sla_document_url = await storeSignedDocument(envelopeId);
        break;

      case 'envelope-declined':
        updateData.sla_status = 'declined';
        // Notify admin when vendor declines
        const declineReason = event.data.envelopeSummary?.recipients?.signers?.[0]?.declinedReason;
        try {
          await sendAdminNotificationEmail({
            subject: `Vendor SLA Declined: ${vendor?.business_name || 'Unknown'}`,
            message: `
              Vendor ${vendor?.contact_name} (${vendor?.business_name}) has declined to sign the SLA.

              Email: ${vendor?.email}
              Reason: ${declineReason || 'No reason provided'}

              Please review and take appropriate action.
            `.trim(),
          });
        } catch (emailError) {
          console.error('[DocuSign Webhook] Failed to send admin notification:', emailError);
        }
        break;

      case 'envelope-voided':
        updateData.sla_status = 'voided';
        break;

      default:
        console.log(`[DocuSign Webhook] Unhandled event type: ${event.event}`);
        return NextResponse.json({ message: 'Event acknowledged' });
    }

    // Update vendor record
    if (Object.keys(updateData).length > 0 && vendor) {
      const { error: updateError } = await adminClient
        .from('vendors')
        .update(updateData)
        .eq('sla_envelope_id', envelopeId);

      if (updateError) {
        console.error('[DocuSign Webhook] Database update error:', updateError);
        return NextResponse.json(
          { message: 'Failed to update vendor' },
          { status: 500 }
        );
      }

      console.log(`[DocuSign Webhook] Updated vendor ${vendor.id} with status: ${updateData.sla_status}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[DocuSign Webhook] Error:', error);
    return NextResponse.json(
      { message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// DocuSign may send GET requests for verification
export async function GET() {
  return NextResponse.json({ message: 'DocuSign webhook endpoint active' });
}
