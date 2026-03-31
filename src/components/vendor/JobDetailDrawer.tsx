'use client';

import { useState } from 'react';
import {
  Drawer,
  Descriptions,
  Divider,
  Typography,
  Space,
  Tag,
  Rate,
  Button,
  Steps,
  Timeline,
  Popconfirm,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  FlagOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
  StarOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import {
  ServiceRequest,
  RequestVendorMatch,
  MatchStatus,
  URGENCY_LABELS,
  PROPERTY_TYPE_LABELS,
  OCCUPANCY_STATUS_LABELS,
  BUDGET_RANGE_LABELS,
  FINISH_LEVEL_LABELS,
  CONTACT_PREFERENCE_LABELS,
  PropertyType,
  OccupancyStatus,
  BudgetRange,
  FinishLevel,
  ContactPreference,
  FollowupStage,
} from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import { useNotify } from '@/hooks/useNotify';
import FollowUpBadge from '@/components/admin/FollowUpBadge';

const { Text, Paragraph } = Typography;

const urgencyColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  emergency: 'red',
};

interface JobWithRequest extends RequestVendorMatch {
  request: ServiceRequest;
  followup?: { stage: FollowupStage } | null;
}

interface JobDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  job: JobWithRequest | null;
  onActionComplete: () => void;
}

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
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
};

const MATCH_STATUS_COLORS: Record<MatchStatus, string> = {
  pending: 'orange',
  intro_sent: 'blue',
  estimate_sent: 'cyan',
  vendor_accepted: 'green',
  vendor_declined: 'red',
  no_response: 'default',
  in_progress: 'geekblue',
  completed: 'success',
  cancelled: 'default',
  no_show: 'volcano',
};

function getStepIndex(status: MatchStatus): number {
  switch (status) {
    case 'pending':
    case 'intro_sent':
    case 'estimate_sent':
      return 0;
    case 'vendor_accepted':
      return 1;
    case 'in_progress':
      return 2;
    case 'completed':
      return 3;
    case 'vendor_declined':
    case 'no_response':
    case 'cancelled':
    case 'no_show':
      return -1;
    default:
      return 0;
  }
}

export default function JobDetailDrawer({
  open,
  onClose,
  job,
  onActionComplete,
}: JobDetailDrawerProps) {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const { message } = useNotify();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!job) return;
    setActionLoading('accept');
    try {
      const res = await fetch(`/api/vendor/jobs/${job.id}/accept`, { method: 'POST' });
      if (res.ok) {
        message.success('Job accepted! Contact the landlord to schedule.');
        onActionComplete();
      } else {
        const data = await res.json();
        message.error(data.message || 'Failed to accept job');
      }
    } catch {
      message.error('Failed to accept job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!job) return;
    setActionLoading('decline');
    try {
      const res = await fetch(`/api/vendor/jobs/${job.id}/decline`, { method: 'POST' });
      if (res.ok) {
        message.info('Job declined.');
        onActionComplete();
      } else {
        const data = await res.json();
        message.error(data.message || 'Failed to decline job');
      }
    } catch {
      message.error('Failed to decline job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (newStatus: 'in_progress' | 'completed') => {
    if (!job) return;
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/vendor/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const msg = newStatus === 'in_progress' ? 'Job marked as in progress.' : 'Job marked as complete!';
        message.success(msg);
        onActionComplete();
      } else {
        const data = await res.json();
        message.error(data.message || 'Failed to update job status');
      }
    } catch {
      message.error('Failed to update job status');
    } finally {
      setActionLoading(null);
    }
  };

  const stepIndex = job ? getStepIndex(job.status) : 0;
  const isErrorState = job && ['vendor_declined', 'no_response', 'cancelled', 'no_show'].includes(job.status);

  // Build action buttons based on status
  const renderActions = () => {
    if (!job) return null;
    const { status } = job;

    if (['pending', 'intro_sent', 'estimate_sent'].includes(status)) {
      return (
        <Space>
          <Popconfirm
            title="Decline this job?"
            description="The landlord will be notified that you're not available."
            onConfirm={handleDecline}
            okText="Yes, Decline"
            okButtonProps={{ danger: true }}
          >
            <Button
              icon={<CloseCircleOutlined />}
              danger
              loading={actionLoading === 'decline'}
            >
              Decline Job
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleAccept}
            loading={actionLoading === 'accept'}
          >
            Accept Job
          </Button>
        </Space>
      );
    }

    if (status === 'vendor_accepted') {
      return (
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={() => handleStatusUpdate('in_progress')}
          loading={actionLoading === 'in_progress'}
        >
          Mark In Progress
        </Button>
      );
    }

    if (status === 'in_progress') {
      return (
        <Popconfirm
          title="Mark this job as complete?"
          description="This indicates the work has been finished."
          onConfirm={() => handleStatusUpdate('completed')}
          okText="Yes, Complete"
        >
          <Button
            type="primary"
            icon={<FlagOutlined />}
            loading={actionLoading === 'completed'}
          >
            Mark Complete
          </Button>
        </Popconfirm>
      );
    }

    return null;
  };

  // Build timeline from job dates
  const buildTimeline = () => {
    if (!job) return [];
    const items: { children: string; color: 'green' | 'blue' | 'red' | 'gray'; label: string }[] = [];

    items.push({
      children: 'Job assigned',
      color: 'green',
      label: new Date(job.created_at).toLocaleDateString(),
    });

    if (job.intro_sent_at) {
      items.push({
        children: 'Introduction sent',
        color: 'green',
        label: new Date(job.intro_sent_at).toLocaleDateString(),
      });
    }

    if (job.vendor_responded_at) {
      items.push({
        children: job.vendor_accepted ? 'Job accepted' : 'Job declined',
        color: job.vendor_accepted ? 'green' : 'red',
        label: new Date(job.vendor_responded_at).toLocaleDateString(),
      });
    }

    if (job.job_completed_at) {
      items.push({
        children: 'Job completed',
        color: 'green',
        label: new Date(job.job_completed_at).toLocaleDateString(),
      });
    }

    if (job.review_submitted_at) {
      items.push({
        children: 'Review received',
        color: 'blue',
        label: new Date(job.review_submitted_at).toLocaleDateString(),
      });
    }

    return items;
  };

  const getServiceLabel = (job: JobWithRequest) => {
    if (job.request.service_type === 'other') {
      const customDesc = (job.request.service_details as Record<string, string> | undefined)?.custom_service_description;
      return customDesc || 'Other Service';
    }
    return SERVICE_TYPE_LABELS[job.request.service_type] || job.request.service_type;
  };

  return (
    <Drawer
      title={
        <Space>
          <span>Job Details</span>
          {job && (
            <Tag color={MATCH_STATUS_COLORS[job.status]}>
              {MATCH_STATUS_LABELS[job.status]}
            </Tag>
          )}
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={open}
      size="large"
      footer={renderActions()}
      styles={{ footer: { textAlign: 'right' } }}
    >
      {job ? (
        <div>
          {/* Steps Indicator */}
          <Steps
            current={isErrorState ? undefined : stepIndex}
            status={isErrorState ? 'error' : undefined}
            size="small"
            style={{ marginBottom: 24 }}
            items={[
              { title: 'Intro Sent' },
              { title: 'Accepted' },
              { title: 'In Progress' },
              { title: 'Completed' },
            ]}
          />

          {/* Service Information */}
          <Descriptions
            column={2}
            bordered
            size="small"
            title={<><HomeOutlined style={{ marginRight: 8 }} />Service Details</>}
          >
            <Descriptions.Item label="Service Type" span={2}>
              {getServiceLabel(job)}
            </Descriptions.Item>
            <Descriptions.Item label="Urgency">
              <Tag color={urgencyColors[job.request.urgency]}>
                {URGENCY_LABELS[job.request.urgency]}
              </Tag>
            </Descriptions.Item>
            {job.request.budget_range && (
              <Descriptions.Item label="Budget">
                {BUDGET_RANGE_LABELS[job.request.budget_range as BudgetRange] || job.request.budget_range}
              </Descriptions.Item>
            )}
            {job.request.finish_level && (
              <Descriptions.Item label="Finish Level" span={2}>
                {FINISH_LEVEL_LABELS[job.request.finish_level as FinishLevel]}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Service Details (sub-categories) */}
          {job.request.service_details && Object.keys(job.request.service_details).length > 0 && (
            <>
              <Divider style={{ marginTop: 24 }}>Service Specifications</Divider>
              <Descriptions column={1} bordered size="small">
                {Object.entries(job.request.service_details).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}

          {/* Property Information */}
          <Divider><EnvironmentOutlined style={{ marginRight: 8 }} />Property Information</Divider>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Address" span={2}>
              {job.request.property_address || job.request.property_location}
            </Descriptions.Item>
            {job.request.zip_code && (
              <Descriptions.Item label="Zip Code">
                {job.request.zip_code}
              </Descriptions.Item>
            )}
            {job.request.property_type && (
              <Descriptions.Item label="Property Type">
                {PROPERTY_TYPE_LABELS[job.request.property_type as PropertyType]}
              </Descriptions.Item>
            )}
            {job.request.occupancy_status && (
              <Descriptions.Item label="Occupancy">
                {OCCUPANCY_STATUS_LABELS[job.request.occupancy_status as OccupancyStatus]}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Job Description */}
          <Divider>Job Description</Divider>
          <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 16, borderRadius: 8 }}>
            {job.request.job_description}
          </Paragraph>

          {/* Photos/Media */}
          {job.request.media_urls && job.request.media_urls.length > 0 && (
            <>
              <Divider><PictureOutlined style={{ marginRight: 8 }} />Photos ({job.request.media_urls.length})</Divider>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {job.request.media_urls.map((url, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      paddingBottom: '100%',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid #d9d9d9',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(url, '_blank')}
                  >
                    <Image
                      src={url}
                      alt={`Job photo ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="150px"
                    />
                  </div>
                ))}
              </div>
              <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                Click on a photo to view full size
              </Text>
            </>
          )}

          {/* Landlord Contact */}
          <Divider><MailOutlined style={{ marginRight: 8 }} />Landlord Contact</Divider>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Name">
              {job.request.first_name && job.request.last_name
                ? `${job.request.first_name} ${job.request.last_name}`
                : job.request.landlord_name || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              <a href={`mailto:${job.request.landlord_email}`}>
                <MailOutlined style={{ marginRight: 4 }} />
                {job.request.landlord_email}
              </a>
            </Descriptions.Item>
            {job.request.landlord_phone && (
              <Descriptions.Item label="Phone">
                <a href={`tel:${job.request.landlord_phone}`}>
                  <PhoneOutlined style={{ marginRight: 4 }} />
                  {job.request.landlord_phone}
                </a>
              </Descriptions.Item>
            )}
            {job.request.contact_preference && (
              <Descriptions.Item label="Preferred Contact">
                {CONTACT_PREFERENCE_LABELS[job.request.contact_preference as ContactPreference]}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Follow-up Badge */}
          {job.followup?.stage && (
            <>
              <Divider>Follow-Up Status</Divider>
              <FollowUpBadge stage={job.followup.stage} />
            </>
          )}

          {/* Review (if exists) */}
          {job.review_rating && (
            <>
              <Divider><StarOutlined style={{ marginRight: 8 }} />Landlord Review</Divider>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Rate disabled defaultValue={job.review_rating} />
                {job.review_text && (
                  <Paragraph style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f' }}>
                    {job.review_text}
                  </Paragraph>
                )}
              </Space>
            </>
          )}

          {/* Timeline */}
          {buildTimeline().length > 1 && (
            <>
              <Divider>Timeline</Divider>
              <Timeline
                mode="left"
                items={buildTimeline()}
              />
            </>
          )}
        </div>
      ) : (
        <Text type="secondary">No job selected</Text>
      )}
    </Drawer>
  );
}
