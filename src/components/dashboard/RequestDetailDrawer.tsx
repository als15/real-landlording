'use client';

import { useState, useEffect } from 'react';
import {
  Drawer,
  Descriptions,
  Divider,
  Typography,
  Card,
  Space,
  Tag,
  Rate,
  Badge,
  Button,
  Steps,
  Timeline,
  Spin,
} from 'antd';
import {
  StarOutlined,
  HeartOutlined,
  HeartFilled,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import {
  ServiceRequest,
  RequestVendorMatch,
  Vendor,
  REQUEST_STATUS_LABELS,
  URGENCY_LABELS,
  PROPERTY_TYPE_LABELS,
  FINISH_LEVEL_LABELS,
  FollowupStage,
} from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import FollowUpBadge from '@/components/admin/FollowUpBadge';
import { useNotify } from '@/hooks/useNotify';
import { brandColors } from '@/theme/config';

const { Text, Paragraph } = Typography;

const statusColors: Record<string, string> = {
  new: 'blue',
  matching: 'orange',
  matched: 'green',
  completed: 'default',
  cancelled: 'red',
  failed: 'volcano',
};

const urgencyColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  emergency: 'red',
};

interface MatchWithFollowup extends RequestVendorMatch {
  vendor: Vendor;
  followup?: { stage: FollowupStage } | null;
}

interface RequestWithMatchesAndFollowups extends ServiceRequest {
  matches?: MatchWithFollowup[];
}

interface RequestDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  requestId: string | null;
  onReviewClick: (match: RequestVendorMatch & { vendor: Vendor }) => void;
  onSaveVendor?: (vendorId: string) => void;
  savedVendorIds?: Set<string>;
}

function getStatusStep(status: string): number {
  switch (status) {
    case 'new': return 0;
    case 'matching': return 1;
    case 'matched': return 2;
    case 'completed': return 3;
    case 'cancelled':
    case 'failed':
      return -1;
    default: return 0;
  }
}

export default function RequestDetailDrawer({
  open,
  onClose,
  requestId,
  onReviewClick,
  onSaveVendor,
  savedVendorIds = new Set(),
}: RequestDetailDrawerProps) {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const [request, setRequest] = useState<RequestWithMatchesAndFollowups | null>(null);
  const [loading, setLoading] = useState(false);
  const { message } = useNotify();

  useEffect(() => {
    if (open && requestId) {
      setLoading(true);
      fetch(`/api/landlord/requests/${requestId}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setRequest(data);
          } else {
            message.error('Failed to load request details');
          }
        })
        .catch(() => message.error('Failed to load request details'))
        .finally(() => setLoading(false));
    }
  }, [open, requestId, message]);

  const stepStatus = request ? getStatusStep(request.status) : 0;
  const isErrorState = request && (request.status === 'cancelled' || request.status === 'failed');

  // Build timeline items from request + match data
  const buildTimeline = () => {
    if (!request) return [];
    const items = [
      {
        children: `Request submitted`,
        color: 'green' as const,
        label: new Date(request.created_at).toLocaleDateString(),
      },
    ];

    if (request.matches && request.matches.length > 0) {
      const firstIntro = request.matches.find((m) => m.intro_sent_at);
      if (firstIntro?.intro_sent_at) {
        items.push({
          children: `Vendors matched (${request.matches.length})`,
          color: 'green' as const,
          label: new Date(firstIntro.intro_sent_at).toLocaleDateString(),
        });
      }

      const accepted = request.matches.find((m) => m.vendor_responded_at && m.vendor_accepted);
      if (accepted?.vendor_responded_at) {
        items.push({
          children: `${accepted.vendor.business_name} accepted`,
          color: 'green' as const,
          label: new Date(accepted.vendor_responded_at).toLocaleDateString(),
        });
      }

      const completed = request.matches.find((m) => m.job_completed_at);
      if (completed?.job_completed_at) {
        items.push({
          children: 'Job completed',
          color: 'green' as const,
          label: new Date(completed.job_completed_at).toLocaleDateString(),
        });
      }

      const reviewed = request.matches.find((m) => m.review_submitted_at);
      if (reviewed?.review_submitted_at) {
        items.push({
          children: 'Review submitted',
          color: 'green' as const,
          label: new Date(reviewed.review_submitted_at).toLocaleDateString(),
        });
      }
    }

    return items;
  };

  return (
    <Drawer
      title="Request Details"
      placement="right"
      onClose={onClose}
      open={open}
      size="large"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : request ? (
        <div>
          {/* Status Steps */}
          <Steps
            current={isErrorState ? stepStatus : stepStatus}
            status={isErrorState ? 'error' : undefined}
            size="small"
            style={{ marginBottom: 24 }}
            items={[
              { title: 'Submitted' },
              { title: 'Matching' },
              { title: 'Matched' },
              { title: 'Completed' },
            ]}
          />

          {/* Request Info */}
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Service">
              {request.service_type === 'other'
                ? (request.service_details as Record<string, string> | undefined)?.custom_service_description || 'Other Service'
                : SERVICE_TYPE_LABELS[request.service_type] || request.service_type}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {request.property_address || request.zip_code || request.property_location}
            </Descriptions.Item>
            <Descriptions.Item label="Urgency">
              <Tag color={urgencyColors[request.urgency]}>
                {URGENCY_LABELS[request.urgency]}
              </Tag>
            </Descriptions.Item>
            {request.property_type && (
              <Descriptions.Item label="Property Type">
                {PROPERTY_TYPE_LABELS[request.property_type]}
              </Descriptions.Item>
            )}
            {request.finish_level && (
              <Descriptions.Item label="Finish Level">
                {FINISH_LEVEL_LABELS[request.finish_level]}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Status">
              <Tag color={statusColors[request.status]}>
                {REQUEST_STATUS_LABELS[request.status as keyof typeof REQUEST_STATUS_LABELS]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Submitted">
              {new Date(request.created_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>

          {/* Job Description */}
          <Divider>Job Description</Divider>
          <Paragraph>{request.job_description}</Paragraph>

          {/* Service Details */}
          {request.service_details && Object.keys(request.service_details).length > 0 && (
            <>
              <Divider>Service Details</Divider>
              <Descriptions column={1} bordered size="small">
                {Object.entries(request.service_details).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}

          {/* Matched Vendors */}
          {request.matches && request.matches.length > 0 && (
            <>
              <Divider>Matched Vendors</Divider>
              <Space direction="vertical" style={{ width: '100%' }}>
                {request.matches.map((match) => (
                  <Card key={match.id} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text strong>{match.vendor.business_name}</Text>
                        <br />
                        <Text type="secondary">{match.vendor.contact_name}</Text>
                        <div style={{ marginTop: 4 }}>
                          {match.vendor.phone && (
                            <Text type="secondary" style={{ fontSize: 12, marginRight: 12 }}>
                              <PhoneOutlined /> {match.vendor.phone}
                            </Text>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <MailOutlined /> {match.vendor.email}
                          </Text>
                        </div>
                        {match.vendor.performance_score > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Score: {match.vendor.performance_score} | {match.vendor.total_reviews} review{match.vendor.total_reviews !== 1 ? 's' : ''}
                            </Text>
                          </div>
                        )}
                        {match.followup?.stage && (
                          <div style={{ marginTop: 4 }}>
                            <FollowUpBadge stage={match.followup.stage} />
                          </div>
                        )}
                      </div>
                      <Space direction="vertical" align="end" size="small">
                        {match.review_rating ? (
                          <Space>
                            <Rate disabled defaultValue={match.review_rating} style={{ fontSize: 14 }} />
                            <Badge status="success" text="Reviewed" />
                          </Space>
                        ) : (
                          <Button
                            type="primary"
                            size="small"
                            icon={<StarOutlined />}
                            onClick={() => onReviewClick(match)}
                          >
                            Leave Review
                          </Button>
                        )}
                        {onSaveVendor && (
                          <Button
                            size="small"
                            type={savedVendorIds.has(match.vendor.id) ? 'default' : 'text'}
                            icon={savedVendorIds.has(match.vendor.id) ? <HeartFilled style={{ color: brandColors.tertiary }} /> : <HeartOutlined />}
                            onClick={() => onSaveVendor(match.vendor.id)}
                            disabled={savedVendorIds.has(match.vendor.id)}
                          >
                            {savedVendorIds.has(match.vendor.id) ? 'Saved' : 'Save Vendor'}
                          </Button>
                        )}
                      </Space>
                    </div>
                  </Card>
                ))}
              </Space>
            </>
          )}

          {/* Waiting message for new requests */}
          {request.status === 'new' && (
            <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <Text type="secondary">
                We&apos;re currently matching you with the best vendors for this job.
                You&apos;ll receive an email once we&apos;ve found matches!
              </Text>
            </div>
          )}

          {/* Request Timeline */}
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
        <Text type="secondary">No request selected</Text>
      )}
    </Drawer>
  );
}
