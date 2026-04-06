'use client';

import { Tag, Tooltip } from 'antd';
import { FollowupStage, FOLLOWUP_STAGE_LABELS } from '@/types/database';

const stageColors: Record<FollowupStage, string> = {
  pending: 'default',
  intro_sent: 'default',
  vendor_check_sent: 'processing',
  vendor_booked: 'success',
  timeline_requested: 'processing',
  vendor_discussing: 'blue',
  vendor_cant_reach: 'warning',
  vendor_no_deal: 'error',
  day7_recheck_sent: 'processing',
  landlord_check_sent: 'processing',
  landlord_contact_ok: 'blue',
  needs_rematch: 'error',
  awaiting_completion: 'purple',
  completion_check_sent: 'processing',
  job_completed: 'success',
  invoice_requested: 'processing',
  job_in_progress: 'purple',
  job_cancelled: 'error',
  cancellation_reason_requested: 'processing',
  feedback_requested: 'processing',
  closed: 'default',
};

const stageTooltips: Record<FollowupStage, string> = {
  pending: 'Follow-up will be sent shortly',
  intro_sent: 'Landlord notified — vendor check in 3 days',
  vendor_check_sent: 'Waiting for vendor to respond',
  vendor_booked: 'Vendor booked the job',
  timeline_requested: 'Waiting for vendor to provide completion timeline',
  vendor_discussing: 'Vendor is still discussing with landlord',
  vendor_cant_reach: "Vendor couldn't reach the landlord",
  vendor_no_deal: 'Vendor declined — no deal',
  day7_recheck_sent: 'Day 7 recheck sent to vendor',
  landlord_check_sent: 'Checking with landlord about vendor contact',
  landlord_contact_ok: 'Landlord confirmed vendor contact',
  needs_rematch: 'Admin action needed — landlord needs a new match',
  awaiting_completion: 'Job in progress — waiting for completion',
  completion_check_sent: 'Completion check sent to vendor',
  job_completed: 'Job completed successfully',
  invoice_requested: 'Waiting for vendor to provide invoice value',
  job_in_progress: 'Job still in progress',
  job_cancelled: 'Job was cancelled',
  cancellation_reason_requested: 'Waiting for vendor to provide cancellation reason',
  feedback_requested: 'Feedback request sent to landlord',
  closed: 'Follow-up closed',
};

interface FollowUpBadgeProps {
  stage: FollowupStage;
}

export default function FollowUpBadge({ stage }: FollowUpBadgeProps) {
  return (
    <Tooltip title={stageTooltips[stage]}>
      <Tag color={stageColors[stage]} style={{ fontSize: 11 }}>
        {FOLLOWUP_STAGE_LABELS[stage]}
      </Tag>
    </Tooltip>
  );
}
