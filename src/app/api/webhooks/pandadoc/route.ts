import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapDocumentStatusToSlaStatus } from '@/lib/pandadoc';
import { sendAdminNotificationEmail } from '@/lib/email/send';

// PandaDoc webhook secret for signature verification (optional but recommended)
const PANDADOC_WEBHOOK_SECRET = process.env.PANDADOC_WEBHOOK_SECRET;

interface PandaDocWebhookEvent {
  event: string;
  data: {
    id: string;
    name: string;
    status: string;
    date_created?: string;
    date_modified?: string;
    date_completed?: string;
    date_sent?: string;
    expiration_date?: string;
    metadata?: {
      vendor_id?: string;
      [key: string]: string | undefined;
    };
    recipients?: Array<{
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      has_completed?: boolean;
      signature_date?: string;
    }>;
  };
}

/**
 * Verify PandaDoc webhook signature
 * PandaDoc uses a shared secret for webhook verification
 */
async function verifyWebhookSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  if (!PANDADOC_WEBHOOK_SECRET) {
    // If no secret configured, skip verification (not recommended for production)
    return true;
  }

  const signature = request.headers.get('x-pandadoc-signature');
  if (!signature) {
    console.warn('[PandaDoc Webhook] No signature header present');
    return false;
  }

  // PandaDoc uses HMAC-SHA256 for signature verification
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(PANDADOC_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error('[PandaDoc Webhook] Invalid signature');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    const event: PandaDocWebhookEvent = JSON.parse(body);
    const documentId = event.data.id;
    const documentStatus = event.data.status;
    const vendorIdFromMetadata = event.data.metadata?.vendor_id;

    console.log(`[PandaDoc Webhook] Event: ${event.event}, Document: ${documentId}, Status: ${documentStatus}`);

    if (!documentId) {
      console.error('[PandaDoc Webhook] No document ID in event');
      return NextResponse.json({ message: 'Missing document ID' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Find vendor by document ID (stored in sla_envelope_id)
    let vendor = null;
    const { data: vendorByEnvelope, error: fetchError } = await adminClient
      .from('vendors')
      .select('id, email, contact_name, business_name')
      .eq('sla_envelope_id', documentId)
      .single();

    if (fetchError || !vendorByEnvelope) {
      // Try to find by vendor ID from metadata
      if (vendorIdFromMetadata) {
        const { data: vendorById } = await adminClient
          .from('vendors')
          .select('id, email, contact_name, business_name')
          .eq('id', vendorIdFromMetadata)
          .single();

        if (vendorById) {
          vendor = vendorById;
          // Update the vendor with the document ID if it wasn't set
          await adminClient
            .from('vendors')
            .update({ sla_envelope_id: documentId })
            .eq('id', vendorIdFromMetadata);
        }
      }

      if (!vendor) {
        console.error(`[PandaDoc Webhook] Vendor not found for document ${documentId}`);
        return NextResponse.json({ message: 'Vendor not found' }, { status: 404 });
      }
    } else {
      vendor = vendorByEnvelope;
    }

    // Map the document status to our SLA status
    const slaStatus = mapDocumentStatusToSlaStatus(documentStatus);

    // Prepare update data based on event type
    const updateData: Record<string, unknown> = {};

    switch (event.event) {
      case 'document_state_changed':
        // Handle status changes
        switch (documentStatus) {
          case 'document.sent':
            updateData.sla_status = 'sent';
            updateData.sla_sent_at = event.data.date_sent || new Date().toISOString();
            break;

          case 'document.viewed':
            updateData.sla_status = 'viewed';
            break;

          case 'document.completed':
            updateData.sla_status = 'signed';
            updateData.sla_signed_at = event.data.date_completed || new Date().toISOString();
            // Store link to document in PandaDoc
            updateData.sla_document_url = `https://app.pandadoc.com/a/#/documents/${documentId}`;
            break;

          case 'document.declined':
            updateData.sla_status = 'declined';
            // Notify admin when vendor declines
            try {
              await sendAdminNotificationEmail({
                subject: `Vendor SLA Declined: ${vendor.business_name || 'Unknown'}`,
                message: `
                  Vendor ${vendor.contact_name} (${vendor.business_name}) has declined to sign the SLA.

                  Email: ${vendor.email}

                  Please review and take appropriate action.
                `.trim(),
              });
            } catch (emailError) {
              console.error('[PandaDoc Webhook] Failed to send admin notification:', emailError);
            }
            break;

          case 'document.voided':
          case 'document.expired':
            updateData.sla_status = 'voided';
            break;

          default:
            console.log(`[PandaDoc Webhook] Unhandled document status: ${documentStatus}`);
        }
        break;

      case 'document_completed_pdf_ready':
        // PDF is ready for download - document was already marked as signed
        // Could optionally download and store the PDF here
        console.log(`[PandaDoc Webhook] PDF ready for document ${documentId}`);
        break;

      default:
        console.log(`[PandaDoc Webhook] Unhandled event type: ${event.event}`);
        return NextResponse.json({ message: 'Event acknowledged' });
    }

    // Update vendor record
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminClient
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id);

      if (updateError) {
        console.error('[PandaDoc Webhook] Database update error:', updateError);
        return NextResponse.json(
          { message: 'Failed to update vendor' },
          { status: 500 }
        );
      }

      console.log(`[PandaDoc Webhook] Updated vendor ${vendor.id} with status: ${updateData.sla_status}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('[PandaDoc Webhook] Error:', error);
    return NextResponse.json(
      { message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// PandaDoc may send GET requests for verification
export async function GET() {
  return NextResponse.json({ message: 'PandaDoc webhook endpoint active' });
}
