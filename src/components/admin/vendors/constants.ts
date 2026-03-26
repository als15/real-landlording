import type { VendorStatus, SlaStatus, MatchStatus } from '@/types/database'

export const statusColors: Record<VendorStatus, string> = {
  active: 'green',
  inactive: 'default',
  pending_review: 'orange',
  rejected: 'red',
}

export const slaStatusColors: Record<SlaStatus, string> = {
  not_sent: 'default',
  sent: 'processing',
  delivered: 'processing',
  viewed: 'warning',
  signed: 'success',
  declined: 'error',
  voided: 'default',
}

export const matchStatusColors: Record<MatchStatus, string> = {
  pending: 'default',
  intro_sent: 'processing',
  estimate_sent: 'processing',
  vendor_accepted: 'success',
  vendor_declined: 'error',
  no_response: 'warning',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'default',
  no_show: 'error',
}

export const matchStatusLabels: Record<MatchStatus, string> = {
  pending: 'Pending',
  intro_sent: 'Intro Sent',
  estimate_sent: 'Estimate Sent',
  vendor_accepted: 'Accepted',
  vendor_declined: 'Declined',
  no_response: 'No Response',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}
