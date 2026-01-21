/**
 * PandaDoc Integration
 *
 * Exports all PandaDoc-related functions for vendor SLA management.
 */

export { isPandaDocConfigured, pandadocFetch, mapDocumentStatusToSlaStatus, waitForDraftStatus } from './client';
export type { SlaStatus } from './client';

export {
  sendSlaToVendor,
  getSlaStatus,
  voidSlaDocument,
  resendSlaNotification,
  getSignedDocumentUrl,
} from './sla';
export type { VendorSlaData, SendSlaResult, SlaStatusResult } from './sla';
