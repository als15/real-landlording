'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Empty,
  Select,
  Skeleton,
  Spin,
} from 'antd';
import {
  EyeOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import {
  ServiceRequest,
  RequestVendorMatch,
  MatchStatus,
  URGENCY_LABELS,
  FollowupStage,
} from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import type { ColumnsType } from 'antd/es/table';
import JobDetailDrawer from '@/components/vendor/JobDetailDrawer';

const { Title, Text } = Typography;

const urgencyColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  emergency: 'red',
};

const MATCH_STATUS_LABELS: Record<string, string> = {
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

const MATCH_STATUS_COLORS: Record<string, string> = {
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

// Filter options — vendor-relevant statuses
const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'intro_sent', label: 'Intro Sent' },
  { value: 'vendor_accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'vendor_declined', label: 'Declined' },
];

interface JobWithRequest extends RequestVendorMatch {
  request: ServiceRequest;
  followup?: { stage: FollowupStage } | null;
}

export default function VendorJobsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>}>
      <JobsContent />
    </Suspense>
  );
}

function JobsContent() {
  const searchParams = useSearchParams();
  const { labels: SERVICE_TYPE_LABELS, categories } = useServiceTaxonomy();
  const [jobs, setJobs] = useState<JobWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithRequest | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    searchParams.get('status') || undefined
  );
  const [serviceFilter, setServiceFilter] = useState<string | undefined>();
  const [urgencyFilter, setUrgencyFilter] = useState<string | undefined>();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (serviceFilter) params.set('service_type', serviceFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);

      const url = `/api/vendor/jobs${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const { data } = await response.json();
        setJobs(data || []);
      } else if (response.status === 401) {
        window.location.href = '/vendor/login?redirectTo=/vendor/dashboard/jobs';
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, urgencyFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleViewJob = (job: JobWithRequest) => {
    setSelectedJob(job);
    setDrawerOpen(true);
  };

  const handleActionComplete = () => {
    setDrawerOpen(false);
    setSelectedJob(null);
    fetchJobs();
  };

  const clearFilters = () => {
    setStatusFilter(undefined);
    setServiceFilter(undefined);
    setUrgencyFilter(undefined);
  };

  const hasFilters = statusFilter || serviceFilter || urgencyFilter;

  const getServiceLabel = (record: JobWithRequest) => {
    if (record.request.service_type === 'other') {
      const customDesc = (record.request.service_details as Record<string, string> | undefined)?.custom_service_description;
      return customDesc || 'Other Service';
    }
    return SERVICE_TYPE_LABELS[record.request.service_type] || record.request.service_type;
  };

  const columns: ColumnsType<JobWithRequest> = [
    {
      title: 'Service',
      key: 'service',
      render: (_, record) => getServiceLabel(record),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => record.request.property_location,
      ellipsis: true,
    },
    {
      title: 'Urgency',
      key: 'urgency',
      render: (_, record) => (
        <Tag color={urgencyColors[record.request.urgency]}>
          {URGENCY_LABELS[record.request.urgency]?.split(' - ')[0]}
        </Tag>
      ),
      responsive: ['md'] as const,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={MATCH_STATUS_COLORS[record.status]}>
          {MATCH_STATUS_LABELS[record.status] || record.status}
        </Tag>
      ),
    },
    {
      title: 'Landlord',
      key: 'landlord',
      render: (_, record) => {
        if (record.request.first_name && record.request.last_name) {
          return `${record.request.first_name} ${record.request.last_name}`;
        }
        return record.request.landlord_name || '-';
      },
      responsive: ['lg'] as const,
    },
    {
      title: 'Received',
      key: 'created',
      render: (_, record) => new Date(record.created_at).toLocaleDateString(),
      responsive: ['sm'] as const,
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

  const serviceOptions = categories.map((c) => ({ value: c.key, label: c.label }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>My Jobs</Title>
        <Text type="secondary">Manage your job referrals and track progress</Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 150 }}
            options={STATUS_FILTER_OPTIONS}
          />
          <Select
            placeholder="Service Type"
            value={serviceFilter}
            onChange={setServiceFilter}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 200 }}
            options={serviceOptions}
          />
          <Select
            placeholder="Urgency"
            value={urgencyFilter}
            onChange={setUrgencyFilter}
            allowClear
            style={{ width: 140 }}
            options={Object.entries(URGENCY_LABELS).map(([value, label]) => ({ value, label }))}
          />
          {hasFilters && (
            <Button icon={<ClearOutlined />} onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </Space>
      </Card>

      {/* Table */}
      {loading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <Empty
            description={
              hasFilters ? (
                <Space direction="vertical">
                  <Text>No jobs match your filters.</Text>
                  <Button type="link" onClick={clearFilters}>Clear Filters</Button>
                </Space>
              ) : (
                <Text>No jobs assigned yet. You&apos;ll see referrals here when landlords need your services.</Text>
              )
            }
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={jobs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
          />
        </Card>
      )}

      {/* Job Detail Drawer */}
      <JobDetailDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedJob(null); }}
        job={selectedJob}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
