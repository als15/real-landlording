'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Empty,
  Spin,
  Modal,
  Descriptions,
  Divider,
  Rate,
  Input,
  App,
  Badge,
} from 'antd';
import {
  EyeOutlined,
  PlusOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  ServiceRequest,
  RequestVendorMatch,
  Vendor,
  REQUEST_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  URGENCY_LABELS,
  PROPERTY_TYPE_LABELS,
  FINISH_LEVEL_LABELS,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusColors: Record<string, string> = {
  new: 'blue',
  matching: 'orange',
  matched: 'green',
  completed: 'default',
  cancelled: 'red',
};

interface RequestWithMatches extends ServiceRequest {
  matches?: (RequestVendorMatch & { vendor: Vendor })[];
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<RequestWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithMatches | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<(RequestVendorMatch & { vendor: Vendor }) | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewQuality, setReviewQuality] = useState(0);
  const [reviewPrice, setReviewPrice] = useState(0);
  const [reviewTimeline, setReviewTimeline] = useState(0);
  const [reviewTreatment, setReviewTreatment] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/landlord/requests');
      if (response.ok) {
        const { data } = await response.json();
        setRequests(data || []);
      } else if (response.status === 401) {
        window.location.href = '/auth/login?redirectTo=/dashboard';
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = async (request: ServiceRequest) => {
    // Fetch full request with matches
    try {
      const response = await fetch(`/api/landlord/requests/${request.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data);
        setDetailModalOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching request details:', response.status, errorData);
        message.error(errorData.message || 'Failed to load request details');
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      message.error('Failed to load request details');
    }
  };

  const handleOpenReview = (match: RequestVendorMatch & { vendor: Vendor }) => {
    setSelectedMatch(match);
    setReviewRating(match.review_rating || 0);
    setReviewQuality(match.review_quality || 0);
    setReviewPrice(match.review_price || 0);
    setReviewTimeline(match.review_timeline || 0);
    setReviewTreatment(match.review_treatment || 0);
    setReviewText(match.review_text || '');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedMatch || !reviewRating) {
      message.error('Please select an overall rating');
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/landlord/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: selectedMatch.id,
          rating: reviewRating,
          quality: reviewQuality || null,
          price: reviewPrice || null,
          timeline: reviewTimeline || null,
          treatment: reviewTreatment || null,
          review_text: reviewText,
        }),
      });

      if (response.ok) {
        message.success('Review submitted successfully!');
        setReviewModalOpen(false);
        fetchRequests();
        // Refresh the detail modal if open
        if (selectedRequest) {
          handleViewRequest(selectedRequest);
        }
      } else {
        throw new Error('Failed to submit review');
      }
    } catch {
      message.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const columns: ColumnsType<ServiceRequest> = [
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type) => SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS] || type,
    },
    {
      title: 'Location',
      dataIndex: 'property_location',
      key: 'property_location',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>
          {REQUEST_STATUS_LABELS[status as keyof typeof REQUEST_STATUS_LABELS]}
        </Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewRequest(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>My Service Requests</Title>
          <Text type="secondary">Track your requests and leave reviews for vendors</Text>
        </div>
        <Link href="/request">
          <Button type="primary" icon={<PlusOutlined />} size="large">
            New Request
          </Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <Card>
          <Empty
            description={
              <Space orientation="vertical">
                <Text>You haven&apos;t submitted any service requests yet.</Text>
                <Link href="/request">
                  <Button type="primary" icon={<PlusOutlined />}>
                    Submit Your First Request
                  </Button>
                </Link>
              </Space>
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      {/* Request Detail Modal */}
      <Modal
        title="Request Details"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedRequest && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Service" span={2}>
                {SERVICE_TYPE_LABELS[selectedRequest.service_type]}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedRequest.property_address || selectedRequest.zip_code || selectedRequest.property_location}
              </Descriptions.Item>
              <Descriptions.Item label="Urgency">
                {URGENCY_LABELS[selectedRequest.urgency]}
              </Descriptions.Item>
              {selectedRequest.property_type && (
                <Descriptions.Item label="Property Type">
                  {PROPERTY_TYPE_LABELS[selectedRequest.property_type]}
                </Descriptions.Item>
              )}
              {selectedRequest.finish_level && (
                <Descriptions.Item label="Finish Level">
                  {FINISH_LEVEL_LABELS[selectedRequest.finish_level]}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Status" span={2}>
                <Tag color={statusColors[selectedRequest.status]}>
                  {REQUEST_STATUS_LABELS[selectedRequest.status as keyof typeof REQUEST_STATUS_LABELS]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Submitted" span={2}>
                {new Date(selectedRequest.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {/* Service Details (Sub-categories) */}
            {selectedRequest.service_details && Object.keys(selectedRequest.service_details).length > 0 && (
              <>
                <Divider>Service Details</Divider>
                <Descriptions column={1} bordered size="small">
                  {Object.entries(selectedRequest.service_details).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key}>
                      {value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </>
            )}

            <Divider>Job Description</Divider>
            <Paragraph>{selectedRequest.job_description}</Paragraph>

            {selectedRequest.matches && selectedRequest.matches.length > 0 && (
              <>
                <Divider>Matched Vendors</Divider>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  {selectedRequest.matches.map((match) => (
                    <Card key={match.id} size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{match.vendor.business_name}</Text>
                          <br />
                          <Text type="secondary">{match.vendor.contact_name}</Text>
                          <br />
                          <Text type="secondary">{match.vendor.phone || match.vendor.email}</Text>
                        </div>
                        <Space orientation="vertical" align="end">
                          {match.review_rating ? (
                            <Space>
                              <Rate disabled defaultValue={match.review_rating} style={{ fontSize: 14 }} />
                              <Badge status="success" text="Reviewed" />
                            </Space>
                          ) : (
                            <Button
                              type="primary"
                              icon={<StarOutlined />}
                              onClick={() => handleOpenReview(match)}
                            >
                              Leave Review
                            </Button>
                          )}
                        </Space>
                      </div>
                    </Card>
                  ))}
                </Space>
              </>
            )}

            {selectedRequest.status === 'new' && (
              <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                <Text type="secondary">
                  We&apos;re currently matching you with the best vendors for this job.
                  You&apos;ll receive an email once we&apos;ve found matches!
                </Text>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        title={`Review ${selectedMatch?.vendor.business_name}`}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        onOk={handleSubmitReview}
        confirmLoading={submittingReview}
        okText="Submit Review"
        width={500}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Overall Rating *</Text>
            <div style={{ marginTop: 8 }}>
              <Rate value={reviewRating} onChange={setReviewRating} style={{ fontSize: 28 }} />
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }}>Rate Specific Areas (Optional)</Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Quality of Work</Text>
              <div style={{ marginTop: 4 }}>
                <Rate value={reviewQuality} onChange={setReviewQuality} style={{ fontSize: 18 }} />
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Price / Value</Text>
              <div style={{ marginTop: 4 }}>
                <Rate value={reviewPrice} onChange={setReviewPrice} style={{ fontSize: 18 }} />
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Timeliness</Text>
              <div style={{ marginTop: 4 }}>
                <Rate value={reviewTimeline} onChange={setReviewTimeline} style={{ fontSize: 18 }} />
              </div>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>Professionalism</Text>
              <div style={{ marginTop: 4 }}>
                <Rate value={reviewTreatment} onChange={setReviewTreatment} style={{ fontSize: 18 }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Additional Comments (optional)</Text>
            <TextArea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share any additional feedback about your experience..."
              style={{ marginTop: 8 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
