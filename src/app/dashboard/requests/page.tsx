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
  PlusOutlined,
  StarOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import {
  ServiceRequest,
  RequestVendorMatch,
  Vendor,
  REQUEST_STATUS_LABELS,
  URGENCY_LABELS,
} from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import ReviewModal from '@/components/dashboard/ReviewModal';
import RequestDetailDrawer from '@/components/dashboard/RequestDetailDrawer';
import { useNotify } from '@/hooks/useNotify';

const { Title, Text } = Typography;

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

interface RequestWithMatchCount extends ServiceRequest {
  match_count?: number;
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>}>
      <RequestsContent />
    </Suspense>
  );
}

function RequestsContent() {
  const searchParams = useSearchParams();
  const { labels: SERVICE_TYPE_LABELS, categories } = useServiceTaxonomy();
  const [requests, setRequests] = useState<RequestWithMatchCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<(RequestVendorMatch & { vendor: Vendor }) | null>(null);
  const [savedVendorIds, setSavedVendorIds] = useState<Set<string>>(new Set());
  const { message } = useNotify();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    searchParams.get('status') || undefined
  );
  const [serviceFilter, setServiceFilter] = useState<string | undefined>();
  const [urgencyFilter, setUrgencyFilter] = useState<string | undefined>();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (serviceFilter) params.set('service_type', serviceFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);

      const url = `/api/landlord/requests${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const { data } = await response.json();
        setRequests(data || []);
      } else if (response.status === 401) {
        window.location.href = '/auth/login?redirectTo=/dashboard/requests';
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, urgencyFilter]);

  const fetchSavedVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/landlord/saved-vendors');
      if (res.ok) {
        const { data } = await res.json();
        setSavedVendorIds(new Set((data || []).map((sv: { vendor_id: string }) => sv.vendor_id)));
      }
    } catch {
      // Non-critical, ignore
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchSavedVendors();
  }, [fetchSavedVendors]);

  const handleViewRequest = (request: ServiceRequest) => {
    setSelectedRequestId(request.id);
    setDrawerOpen(true);
  };

  const handleReviewClick = (match: RequestVendorMatch & { vendor: Vendor }) => {
    setSelectedMatch(match);
    setReviewModalOpen(true);
  };

  const handleSaveVendor = async (vendorId: string) => {
    try {
      const res = await fetch('/api/landlord/saved-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      if (res.ok) {
        setSavedVendorIds((prev) => new Set([...prev, vendorId]));
        message.success('Vendor saved!');
      } else if (res.status === 409) {
        message.info('Vendor already saved');
      } else {
        throw new Error();
      }
    } catch {
      message.error('Failed to save vendor');
    }
  };

  const clearFilters = () => {
    setStatusFilter(undefined);
    setServiceFilter(undefined);
    setUrgencyFilter(undefined);
  };

  const hasFilters = statusFilter || serviceFilter || urgencyFilter;

  const columns: ColumnsType<RequestWithMatchCount> = [
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type: string, record: ServiceRequest) => {
        if (type === 'other') {
          const customDesc = (record.service_details as Record<string, string> | undefined)?.custom_service_description;
          return customDesc || 'Other Service';
        }
        return SERVICE_TYPE_LABELS[type] || type;
      },
    },
    {
      title: 'Location',
      dataIndex: 'property_location',
      key: 'property_location',
      ellipsis: true,
    },
    {
      title: 'Urgency',
      dataIndex: 'urgency',
      key: 'urgency',
      render: (urgency: string) => (
        <Tag color={urgencyColors[urgency]}>
          {URGENCY_LABELS[urgency as keyof typeof URGENCY_LABELS]}
        </Tag>
      ),
      responsive: ['md'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {REQUEST_STATUS_LABELS[status as keyof typeof REQUEST_STATUS_LABELS]}
        </Tag>
      ),
    },
    {
      title: 'Vendors',
      dataIndex: 'match_count',
      key: 'match_count',
      render: (count: number) =>
        count > 0 ? <Tag color="green">{count}</Tag> : <Text type="secondary">-</Text>,
      responsive: ['md'],
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
      responsive: ['sm'],
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
          View
        </Button>
      ),
    },
  ];

  const serviceOptions = categories.map((c) => ({ value: c.key, label: c.label }));

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

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 150 }}
            options={Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
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
      ) : requests.length === 0 ? (
        <Card>
          <Empty
            description={
              hasFilters ? (
                <Space direction="vertical">
                  <Text>No requests match your filters.</Text>
                  <Button type="link" onClick={clearFilters}>Clear Filters</Button>
                </Space>
              ) : (
                <Space direction="vertical">
                  <Text>You haven&apos;t submitted any service requests yet.</Text>
                  <Link href="/request">
                    <Button type="primary" icon={<PlusOutlined />}>
                      Submit Your First Request
                    </Button>
                  </Link>
                </Space>
              )
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
            scroll={{ x: 600 }}
          />
        </Card>
      )}

      {/* Request Detail Drawer */}
      <RequestDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        requestId={selectedRequestId}
        onReviewClick={handleReviewClick}
        onSaveVendor={handleSaveVendor}
        savedVendorIds={savedVendorIds}
      />

      {/* Review Modal */}
      <ReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        match={selectedMatch}
        onSuccess={() => {
          fetchRequests();
          if (selectedRequestId) {
            // Re-open drawer to refresh data
            setDrawerOpen(false);
            setTimeout(() => setDrawerOpen(true), 100);
          }
        }}
      />
    </div>
  );
}
