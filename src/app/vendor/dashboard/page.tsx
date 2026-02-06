'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Modal,
  Descriptions,
  Divider,
  Statistic,
  Row,
  Col,
  Rate,
  App,
  Empty,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import {
  ServiceRequest,
  RequestVendorMatch,
  SERVICE_TYPE_LABELS,
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
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

interface JobWithRequest extends RequestVendorMatch {
  request: ServiceRequest;
}

interface VendorStats {
  totalJobs: number;
  pendingJobs: number;
  completedJobs: number;
  averageRating: number;
  totalReviews: number;
}

const urgencyColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  emergency: 'red',
};

export default function VendorDashboardPage() {
  const [jobs, setJobs] = useState<JobWithRequest[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch('/api/vendor/jobs'),
        fetch('/api/vendor/stats'),
      ]);

      if (jobsRes.ok) {
        const { data } = await jobsRes.json();
        setJobs(data || []);
      } else if (jobsRes.status === 401) {
        window.location.href = '/vendor/login?redirectTo=/vendor/dashboard';
        return;
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (job: JobWithRequest) => {
    setSelectedJob(job);
    setDetailModalOpen(true);
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/vendor/jobs/${jobId}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        message.success('Job accepted! Contact the landlord to schedule.');
        fetchData();
        setDetailModalOpen(false);
      } else {
        throw new Error('Failed to accept job');
      }
    } catch {
      message.error('Failed to accept job');
    }
  };

  const columns: ColumnsType<JobWithRequest> = [
    {
      title: 'Service',
      key: 'service',
      render: (_, record) =>
        SERVICE_TYPE_LABELS[record.request.service_type as keyof typeof SERVICE_TYPE_LABELS],
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => record.request.property_location,
    },
    {
      title: 'Urgency',
      key: 'urgency',
      render: (_, record) => (
        <Tag color={urgencyColors[record.request.urgency]}>
          {URGENCY_LABELS[record.request.urgency]?.split(' - ')[0]}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.job_completed) {
          return <Tag color="green">Completed</Tag>;
        }
        if (record.vendor_accepted) {
          return <Tag color="blue">Accepted</Tag>;
        }
        return <Tag color="orange">Pending</Tag>;
      },
    },
    {
      title: 'Rating',
      key: 'rating',
      render: (_, record) =>
        record.review_rating ? (
          <Rate disabled defaultValue={record.review_rating} style={{ fontSize: 14 }} />
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Received',
      key: 'created',
      render: (_, record) => new Date(record.created_at).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewJob(record)}
        >
          View
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
      <Title level={2}>Vendor Dashboard</Title>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Jobs"
                value={stats.totalJobs}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pendingJobs}
                styles={{ content: { color: '#faad14' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completedJobs}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Average Rating"
                value={stats.averageRating.toFixed(1)}
                prefix={<StarOutlined />}
                suffix={`/ 5 (${stats.totalReviews})`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Jobs Table */}
      <Card title="My Job Referrals">
        {jobs.length === 0 ? (
          <Empty description="No jobs assigned yet. You'll see referrals here when landlords need your services." />
        ) : (
          <Table
            columns={columns}
            dataSource={jobs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Job Detail Modal */}
      <Modal
        title="Job Details"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={
          selectedJob && !selectedJob.vendor_accepted
            ? [
                <Button key="close" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>,
                <Button
                  key="accept"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleAcceptJob(selectedJob.id)}
                >
                  Accept Job
                </Button>,
              ]
            : null
        }
        width={700}
      >
        {selectedJob && (
          <>
            {/* Service Information */}
            <Descriptions column={2} bordered size="small" title={<><HomeOutlined style={{ marginRight: 8 }} />Service Details</>}>
              <Descriptions.Item label="Service Type" span={2}>
                {SERVICE_TYPE_LABELS[selectedJob.request.service_type as keyof typeof SERVICE_TYPE_LABELS]}
              </Descriptions.Item>
              <Descriptions.Item label="Urgency">
                <Tag color={urgencyColors[selectedJob.request.urgency]}>
                  {URGENCY_LABELS[selectedJob.request.urgency]}
                </Tag>
              </Descriptions.Item>
              {selectedJob.request.budget_range && (
                <Descriptions.Item label="Budget">
                  {BUDGET_RANGE_LABELS[selectedJob.request.budget_range as BudgetRange] || selectedJob.request.budget_range}
                </Descriptions.Item>
              )}
              {selectedJob.request.finish_level && (
                <Descriptions.Item label="Finish Level" span={2}>
                  {FINISH_LEVEL_LABELS[selectedJob.request.finish_level as FinishLevel]}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Service Details (sub-categories) */}
            {selectedJob.request.service_details && Object.keys(selectedJob.request.service_details).length > 0 && (
              <>
                <Divider style={{ marginTop: 24 }}>Service Specifications</Divider>
                <Descriptions column={1} bordered size="small">
                  {Object.entries(selectedJob.request.service_details).map(([key, value]) => (
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
                {selectedJob.request.property_address || selectedJob.request.property_location}
              </Descriptions.Item>
              {selectedJob.request.zip_code && (
                <Descriptions.Item label="Zip Code">
                  {selectedJob.request.zip_code}
                </Descriptions.Item>
              )}
              {selectedJob.request.property_type && (
                <Descriptions.Item label="Property Type">
                  {PROPERTY_TYPE_LABELS[selectedJob.request.property_type as PropertyType]}
                </Descriptions.Item>
              )}
              {selectedJob.request.occupancy_status && (
                <Descriptions.Item label="Occupancy">
                  {OCCUPANCY_STATUS_LABELS[selectedJob.request.occupancy_status as OccupancyStatus]}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Job Description */}
            <Divider>Job Description</Divider>
            <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 16, borderRadius: 8 }}>
              {selectedJob.request.job_description}
            </Paragraph>

            {/* Photos/Media */}
            {selectedJob.request.media_urls && selectedJob.request.media_urls.length > 0 && (
              <>
                <Divider><PictureOutlined style={{ marginRight: 8 }} />Photos ({selectedJob.request.media_urls.length})</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {selectedJob.request.media_urls.map((url, index) => (
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
                {selectedJob.request.first_name && selectedJob.request.last_name
                  ? `${selectedJob.request.first_name} ${selectedJob.request.last_name}`
                  : selectedJob.request.landlord_name || 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <a href={`mailto:${selectedJob.request.landlord_email}`}>
                  {selectedJob.request.landlord_email}
                </a>
              </Descriptions.Item>
              {selectedJob.request.landlord_phone && (
                <Descriptions.Item label="Phone">
                  <a href={`tel:${selectedJob.request.landlord_phone}`}>
                    {selectedJob.request.landlord_phone}
                  </a>
                </Descriptions.Item>
              )}
              {selectedJob.request.contact_preference && (
                <Descriptions.Item label="Preferred Contact">
                  {CONTACT_PREFERENCE_LABELS[selectedJob.request.contact_preference as ContactPreference]}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Review (if exists) */}
            {selectedJob.review_rating && (
              <>
                <Divider><StarOutlined style={{ marginRight: 8 }} />Landlord Review</Divider>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Rate disabled defaultValue={selectedJob.review_rating} />
                  {selectedJob.review_text && (
                    <Paragraph style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f' }}>
                      {selectedJob.review_text}
                    </Paragraph>
                  )}
                </Space>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
