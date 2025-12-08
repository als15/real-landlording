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
} from '@ant-design/icons';
import {
  ServiceRequest,
  RequestVendorMatch,
  SERVICE_TYPE_LABELS,
  URGENCY_LABELS,
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
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completedJobs}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
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
        width={600}
      >
        {selectedJob && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Service">
                {SERVICE_TYPE_LABELS[selectedJob.request.service_type as keyof typeof SERVICE_TYPE_LABELS]}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedJob.request.property_location}
              </Descriptions.Item>
              <Descriptions.Item label="Urgency">
                <Tag color={urgencyColors[selectedJob.request.urgency]}>
                  {URGENCY_LABELS[selectedJob.request.urgency]}
                </Tag>
              </Descriptions.Item>
              {(selectedJob.request.budget_min || selectedJob.request.budget_max) && (
                <Descriptions.Item label="Budget">
                  ${selectedJob.request.budget_min || 0} - ${selectedJob.request.budget_max || '∞'}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>Job Description</Divider>
            <Paragraph>{selectedJob.request.job_description}</Paragraph>

            <Divider>Landlord Contact</Divider>
            <Space direction="vertical">
              <Text>
                <strong>{selectedJob.request.landlord_name || 'Landlord'}</strong>
              </Text>
              <Text>
                <MailOutlined style={{ marginRight: 8 }} />
                {selectedJob.request.landlord_email}
              </Text>
              {selectedJob.request.landlord_phone && (
                <Text>
                  <PhoneOutlined style={{ marginRight: 8 }} />
                  {selectedJob.request.landlord_phone}
                </Text>
              )}
            </Space>

            {selectedJob.review_rating && (
              <>
                <Divider>Landlord Review</Divider>
                <Space direction="vertical">
                  <Rate disabled defaultValue={selectedJob.review_rating} />
                  {selectedJob.review_text && (
                    <Paragraph>{selectedJob.review_text}</Paragraph>
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
