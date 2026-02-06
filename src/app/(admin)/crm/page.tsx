'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Input,
  Typography,
  Drawer,
  Descriptions,
  Divider,
  App,
  Statistic,
  Row,
  Col,
  Spin,
  Timeline,
  Modal,
  Form,
  InputNumber,
  DatePicker,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  TrophyOutlined,
  StarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import {
  SERVICE_TYPE_LABELS,
  URGENCY_LABELS,
  MatchStatus,
  PAYMENT_STATUS_LABELS,
  JOB_OUTCOME_REASON_LABELS,
  JobOutcomeReason,
  PAYMENT_METHOD_OPTIONS,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

interface CRMJob {
  id: string;
  request_id: string;
  vendor_id: string;
  status: MatchStatus;
  intro_sent: boolean;
  intro_sent_at: string | null;
  vendor_accepted: boolean | null;
  vendor_responded_at: string | null;
  job_won: boolean | null;
  job_won_at: string | null;
  job_completed: boolean | null;
  job_completed_at: string | null;
  job_outcome_reason: JobOutcomeReason | null;
  outcome_notes: string | null;
  review_rating: number | null;
  review_text: string | null;
  review_submitted_at: string | null;
  created_at: string;
  vendor: {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
  };
  request: {
    id: string;
    service_type: string;
    property_address: string | null;
    zip_code: string | null;
    landlord_name: string | null;
    landlord_email: string;
    landlord_phone: string | null;
    job_description: string;
    urgency: string;
    status: string;
    created_at: string;
  };
  payment: {
    id: string;
    amount: number;
    status: string;
    paid_date: string | null;
  } | null;
}

interface PipelineData {
  pipeline: {
    intro_sent: number;
    vendor_accepted: number;
    job_won: number;
    in_progress: number;
    completed: number;
    vendor_declined: number;
    no_response: number;
    no_show: number;
  };
  payments: {
    pending_count: number;
    pending_amount: number;
    paid_count: number;
  };
}

const statusColors: Record<string, string> = {
  pending: 'default',
  intro_sent: 'blue',
  vendor_accepted: 'cyan',
  vendor_declined: 'red',
  no_response: 'orange',
  in_progress: 'purple',
  completed: 'green',
  cancelled: 'default',
  no_show: 'red',
};

const stageFilters = [
  { value: '', label: 'All Jobs' },
  { value: 'intro_sent', label: 'Intro Sent (Awaiting Response)' },
  { value: 'awaiting_outcome', label: 'Accepted (Awaiting Outcome)' },
  { value: 'job_won', label: 'Job Won (In Progress)' },
  { value: 'completed', label: 'Completed' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'lost', label: 'Lost/Declined' },
];

export default function CRMPage() {
  const [jobs, setJobs] = useState<CRMJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [selectedJob, setSelectedJob] = useState<CRMJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();

  const fetchPipeline = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/crm/pipeline');
      if (response.ok) {
        const data = await response.json();
        setPipeline(data);
      }
    } catch (error) {
      console.error('Error fetching pipeline:', error);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (stageFilter) {
        params.append('stage', stageFilter);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`/api/admin/crm/jobs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        setTotal(data.total);
      } else {
        message.error('Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      message.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, stageFilter, searchTerm, message]);

  useEffect(() => {
    fetchPipeline();
    fetchJobs();
  }, [fetchPipeline, fetchJobs]);

  const handleRefresh = () => {
    fetchPipeline();
    fetchJobs();
  };

  const handleViewJob = (job: CRMJob) => {
    setSelectedJob(job);
    setDrawerOpen(true);
  };

  const handleMarkWon = async (job: CRMJob) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/matches/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_won: true }),
      });

      if (response.ok) {
        message.success('Job marked as won');
        handleRefresh();
        setDrawerOpen(false);
      } else {
        message.error('Failed to update job');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      message.error('Failed to update job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkLost = (job: CRMJob) => {
    setSelectedJob(job);
    setOutcomeModalOpen(true);
  };

  const handleSubmitLostOutcome = async (values: { reason: JobOutcomeReason; notes: string }) => {
    if (!selectedJob) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/matches/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_won: false,
          job_outcome_reason: values.reason,
          outcome_notes: values.notes,
          status: 'cancelled',
        }),
      });

      if (response.ok) {
        message.success('Job marked as lost');
        handleRefresh();
        setOutcomeModalOpen(false);
        setDrawerOpen(false);
        form.resetFields();
      } else {
        message.error('Failed to update job');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      message.error('Failed to update job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkComplete = (job: CRMJob) => {
    setSelectedJob(job);
    form.resetFields();
    setCompleteModalOpen(true);
  };

  const handleSubmitComplete = async (values: {
    job_cost?: number;
    payment_amount: number;
    payment_method?: string;
  }) => {
    if (!selectedJob) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/matches/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_completed: true,
          job_outcome_reason: 'completed_successfully',
          create_payment: true,
          payment_amount: values.payment_amount,
          job_cost: values.job_cost,
        }),
      });

      if (response.ok) {
        message.success('Job marked as complete and payment created');
        handleRefresh();
        setCompleteModalOpen(false);
        setDrawerOpen(false);
        form.resetFields();
      } else {
        message.error('Failed to complete job');
      }
    } catch (error) {
      console.error('Error completing job:', error);
      message.error('Failed to complete job');
    } finally {
      setActionLoading(false);
    }
  };

  const getTimelineItems = (job: CRMJob) => {
    const items = [];

    // Request created
    items.push({
      color: 'green',
      children: (
        <div>
          <Text strong>Request Submitted</Text>
          <br />
          <Text type="secondary">{dayjs(job.request.created_at).format('MMM D, YYYY h:mm A')}</Text>
        </div>
      ),
    });

    // Match created
    items.push({
      color: 'green',
      children: (
        <div>
          <Text strong>Matched with Vendor</Text>
          <br />
          <Text type="secondary">{dayjs(job.created_at).format('MMM D, YYYY h:mm A')}</Text>
        </div>
      ),
    });

    // Intro sent
    if (job.intro_sent_at) {
      items.push({
        color: 'green',
        children: (
          <div>
            <Text strong>Intro Sent</Text>
            <br />
            <Text type="secondary">{dayjs(job.intro_sent_at).format('MMM D, YYYY h:mm A')}</Text>
          </div>
        ),
      });
    }

    // Vendor response
    if (job.vendor_responded_at) {
      items.push({
        color: job.vendor_accepted ? 'green' : 'red',
        children: (
          <div>
            <Text strong>{job.vendor_accepted ? 'Vendor Accepted' : 'Vendor Declined'}</Text>
            <br />
            <Text type="secondary">{dayjs(job.vendor_responded_at).format('MMM D, YYYY h:mm A')}</Text>
          </div>
        ),
      });
    }

    // Job won/lost
    if (job.job_won !== null) {
      items.push({
        color: job.job_won ? 'green' : 'red',
        children: (
          <div>
            <Text strong>{job.job_won ? 'Job Won' : 'Job Lost'}</Text>
            {job.job_won_at && (
              <>
                <br />
                <Text type="secondary">{dayjs(job.job_won_at).format('MMM D, YYYY h:mm A')}</Text>
              </>
            )}
            {job.job_outcome_reason && !job.job_won && (
              <>
                <br />
                <Text type="secondary">Reason: {JOB_OUTCOME_REASON_LABELS[job.job_outcome_reason]}</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (job.vendor_accepted) {
      items.push({
        color: 'gray',
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text type="secondary">Awaiting Job Outcome</Text>
            <br />
            <Space>
              <Button type="primary" size="small" onClick={() => handleMarkWon(job)} loading={actionLoading}>
                Mark Won
              </Button>
              <Button size="small" danger onClick={() => handleMarkLost(job)}>
                Mark Lost
              </Button>
            </Space>
          </div>
        ),
      });
    }

    // Job completed
    if (job.job_completed) {
      items.push({
        color: 'green',
        children: (
          <div>
            <Text strong>Job Completed</Text>
            {job.job_completed_at && (
              <>
                <br />
                <Text type="secondary">{dayjs(job.job_completed_at).format('MMM D, YYYY h:mm A')}</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (job.job_won) {
      items.push({
        color: 'gray',
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text type="secondary">Awaiting Completion</Text>
            <br />
            <Button type="primary" size="small" onClick={() => handleMarkComplete(job)}>
              Mark Complete
            </Button>
          </div>
        ),
      });
    }

    // Payment
    if (job.payment) {
      items.push({
        color: job.payment.status === 'paid' ? 'green' : 'orange',
        children: (
          <div>
            <Text strong>Payment: ${job.payment.amount}</Text>
            <br />
            <Tag color={job.payment.status === 'paid' ? 'green' : 'orange'}>
              {PAYMENT_STATUS_LABELS[job.payment.status as keyof typeof PAYMENT_STATUS_LABELS] || job.payment.status}
            </Tag>
            {job.payment.paid_date && (
              <Text type="secondary"> - {dayjs(job.payment.paid_date).format('MMM D, YYYY')}</Text>
            )}
          </div>
        ),
      });
    } else if (job.job_completed) {
      items.push({
        color: 'gray',
        dot: <DollarOutlined />,
        children: (
          <div>
            <Text type="secondary">Payment Not Recorded</Text>
            <br />
            <Button size="small" onClick={() => router.push('/payments')}>
              Record Payment
            </Button>
          </div>
        ),
      });
    }

    // Review
    if (job.review_rating) {
      items.push({
        color: 'gold',
        dot: <StarOutlined />,
        children: (
          <div>
            <Text strong>Review: {job.review_rating}/5</Text>
            {job.review_submitted_at && (
              <>
                <br />
                <Text type="secondary">{dayjs(job.review_submitted_at).format('MMM D, YYYY')}</Text>
              </>
            )}
            {job.review_text && (
              <>
                <br />
                <Text italic>&ldquo;{job.review_text}&rdquo;</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (job.job_completed) {
      items.push({
        color: 'gray',
        dot: <StarOutlined />,
        children: <Text type="secondary">Review Not Collected</Text>,
      });
    }

    return items;
  };

  const columns: ColumnsType<CRMJob> = [
    {
      title: 'Request',
      key: 'request',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{SERVICE_TYPE_LABELS[record.request.service_type as keyof typeof SERVICE_TYPE_LABELS] || record.request.service_type}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.request.zip_code || 'No ZIP'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Landlord',
      key: 'landlord',
      width: 180,
      render: (_, record) => (
        <div>
          <Text>{record.request.landlord_name || 'Unknown'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.request.landlord_email}
          </Text>
        </div>
      ),
    },
    {
      title: 'Vendor',
      key: 'vendor',
      width: 180,
      render: (_, record) => (
        <div>
          <Text strong>{record.vendor.business_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.vendor.contact_name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Stage',
      key: 'stage',
      width: 140,
      render: (_, record) => {
        const stage = record.status;
        let color = statusColors[stage] || 'default';
        let label = stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

        if (record.job_won === true && !record.job_completed) {
          label = 'Job Won';
          color = 'purple';
        } else if (record.job_completed) {
          label = 'Completed';
          color = 'green';
        } else if (record.vendor_accepted && record.job_won === null) {
          label = 'Awaiting Outcome';
          color = 'cyan';
        }

        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Payment',
      key: 'payment',
      width: 120,
      render: (_, record) => {
        if (!record.payment) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <div>
            <Text strong>${record.payment.amount}</Text>
            <br />
            <Tag color={record.payment.status === 'paid' ? 'green' : 'orange'} style={{ fontSize: 10 }}>
              {record.payment.status}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      width: 100,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(date).fromNow()}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleViewJob(record)}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>CRM Dashboard</Title>
        <Text type="secondary">Track job lifecycle from intro to payment</Text>
      </div>

      {/* Pipeline Summary Cards */}
      {pipeline && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small" hoverable onClick={() => setStageFilter('intro_sent')}>
              <Statistic
                title="Intro Sent"
                value={pipeline.pipeline.intro_sent}
                prefix={<SendOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" hoverable onClick={() => setStageFilter('awaiting_outcome')}>
              <Statistic
                title="Awaiting Outcome"
                value={pipeline.pipeline.vendor_accepted}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" hoverable onClick={() => setStageFilter('job_won')}>
              <Statistic
                title="Jobs Won"
                value={pipeline.pipeline.job_won + pipeline.pipeline.in_progress}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" hoverable onClick={() => setStageFilter('completed')}>
              <Statistic
                title="Completed"
                value={pipeline.pipeline.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" hoverable onClick={() => router.push('/payments')}>
              <Statistic
                title="Pending Payments"
                value={pipeline.payments.pending_count}
                prefix={<DollarOutlined />}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>${pipeline.payments.pending_amount}</Text>}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="Paid"
                value={pipeline.payments.paid_count}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 250 }}
            value={stageFilter}
            onChange={setStageFilter}
            options={stageFilters}
            placeholder="Filter by stage"
          />
          <Search
            placeholder="Search landlord or vendor..."
            style={{ width: 250 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Jobs Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `${total} jobs`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          size="small"
        />
      </Card>

      {/* Job Detail Drawer */}
      <Drawer
        title={
          <Space>
            <Text>Job Details</Text>
            {selectedJob && (
              <Tag color={statusColors[selectedJob.status] || 'default'}>
                {selectedJob.status.replace(/_/g, ' ')}
              </Tag>
            )}
          </Space>
        }
        placement="right"
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedJob && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Service Type">
                {SERVICE_TYPE_LABELS[selectedJob.request.service_type as keyof typeof SERVICE_TYPE_LABELS] || selectedJob.request.service_type}
              </Descriptions.Item>
              <Descriptions.Item label="Urgency">
                <Tag color={selectedJob.request.urgency === 'emergency' ? 'red' : 'default'}>
                  {URGENCY_LABELS[selectedJob.request.urgency as keyof typeof URGENCY_LABELS] || selectedJob.request.urgency}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Property">
                {selectedJob.request.property_address || 'N/A'} {selectedJob.request.zip_code}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedJob.request.job_description}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Landlord</Divider>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{selectedJob.request.landlord_name || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedJob.request.landlord_email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedJob.request.landlord_phone || 'N/A'}</Descriptions.Item>
            </Descriptions>

            <Divider>Vendor</Divider>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Business">{selectedJob.vendor.business_name}</Descriptions.Item>
              <Descriptions.Item label="Contact">{selectedJob.vendor.contact_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedJob.vendor.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedJob.vendor.phone || 'N/A'}</Descriptions.Item>
            </Descriptions>

            <Divider>Timeline</Divider>
            <Timeline items={getTimelineItems(selectedJob)} />
          </>
        )}
      </Drawer>

      {/* Lost Outcome Modal */}
      <Modal
        title="Mark Job as Lost"
        open={outcomeModalOpen}
        onCancel={() => {
          setOutcomeModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitLostOutcome}>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please select a reason' }]}
          >
            <Select
              placeholder="Select reason"
              options={Object.entries(JOB_OUTCOME_REASON_LABELS)
                .filter(([key]) => key !== 'completed_successfully')
                .map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Additional notes (optional)" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit" loading={actionLoading}>
                Mark as Lost
              </Button>
              <Button onClick={() => setOutcomeModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Complete Job Modal */}
      <Modal
        title="Mark Job as Complete"
        open={completeModalOpen}
        onCancel={() => {
          setCompleteModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitComplete}>
          <Form.Item
            name="payment_amount"
            label="Referral Fee Amount ($)"
            rules={[{ required: true, message: 'Please enter the referral fee amount' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter referral fee"
              prefix="$"
            />
          </Form.Item>
          <Form.Item name="job_cost" label="Job Cost (what landlord paid vendor) - Optional">
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Enter job cost"
              prefix="$"
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={actionLoading}>
                Complete & Create Payment
              </Button>
              <Button onClick={() => setCompleteModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
