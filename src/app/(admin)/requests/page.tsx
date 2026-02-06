'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table,
  Card,
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
  Badge,
  Image,
  Row,
  Col,
  Spin,
  Tooltip,
  Dropdown,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  FilterOutlined,
  DownloadOutlined,
  SendOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  DownOutlined,
  PlusOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import MediaUpload from '@/components/MediaUpload';
import {
  ServiceRequest,
  RequestStatus,
  REQUEST_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  URGENCY_LABELS,
  PROPERTY_TYPE_LABELS,
  UNIT_COUNT_LABELS,
  OCCUPANCY_STATUS_LABELS,
  CONTACT_PREFERENCE_LABELS,
  BUDGET_RANGE_LABELS,
  FINISH_LEVEL_LABELS,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';
import VendorMatchingModal from '@/components/admin/VendorMatchingModal';
import {
  objectsToCsv,
  downloadCsv,
  formatDateTimeForCsv,
} from '@/lib/utils/csv-export';

const { Title, Text, Link } = Typography;
const { Search } = Input;

interface VendorMatch {
  id: string;
  vendor_id: string;
  intro_sent: boolean;
  intro_sent_at: string | null;
  vendor: {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
    phone: string;
  };
}

const statusColors: Record<RequestStatus, string> = {
  new: 'blue',
  matching: 'orange',
  matched: 'green',
  completed: 'default',
  cancelled: 'red',
};

const urgencyColors: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  emergency: 'red',
};

// Helper to calculate request age and get appropriate styling
function getRequestAge(createdAt: string): { text: string; color: string; isStale: boolean } {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    return { text: diffHours === 0 ? 'Just now' : `${diffHours}h ago`, color: '#52c41a', isStale: false };
  } else if (diffDays === 1) {
    return { text: '1 day ago', color: '#1890ff', isStale: false };
  } else if (diffDays <= 2) {
    return { text: `${diffDays} days ago`, color: '#faad14', isStale: false };
  } else if (diffDays <= 7) {
    return { text: `${diffDays} days ago`, color: '#ff7a45', isStale: true };
  } else {
    return { text: `${diffDays} days ago`, color: '#ff4d4f', isStale: true };
  }
}

// Filter presets for quick access
interface FilterPreset {
  key: string;
  label: string;
  icon: React.ReactNode;
  filter: { status?: string; urgency?: string; staleOnly?: boolean };
}

const FILTER_PRESETS: FilterPreset[] = [
  { key: 'all', label: 'All Requests', icon: null, filter: {} },
  { key: 'emergency', label: 'Emergency', icon: <ThunderboltOutlined style={{ color: '#ff4d4f' }} />, filter: { urgency: 'emergency' } },
  { key: 'new', label: 'New', icon: <ExclamationCircleOutlined style={{ color: '#1890ff' }} />, filter: { status: 'new' } },
  { key: 'unmatched', label: 'Unmatched', icon: <ClockCircleOutlined style={{ color: '#faad14' }} />, filter: { status: 'new' } },
  { key: 'stale', label: 'Stale (3+ days)', icon: <ClockCircleOutlined style={{ color: '#ff4d4f' }} />, filter: { staleOnly: true } },
];

export default function RequestsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>}>
      <RequestsPageContent />
    </Suspense>
  );
}

function RequestsPageContent() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [staleOnly, setStaleOnly] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedRequestMatches, setSelectedRequestMatches] = useState<VendorMatch[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);
  const [resendingVendorId, setResendingVendorId] = useState<string | null>(null);
  const [editingMedia, setEditingMedia] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [savingMedia, setSavingMedia] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewRequestId = searchParams.get('view');

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (urgencyFilter) {
        params.append('urgency', urgencyFilter);
      }

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/requests?${params}`);
      if (response.ok) {
        let { data, count } = await response.json();

        // Client-side filter for stale requests (3+ days old with status 'new')
        if (staleOnly && data) {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          data = data.filter((r: ServiceRequest) => {
            const created = new Date(r.created_at);
            return created < threeDaysAgo && r.status === 'new';
          });
          count = data.length;
        }

        setRequests(data || []);
        setTotal(count || 0);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      message.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, urgencyFilter, staleOnly, debouncedSearch, message]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle view query parameter to open request drawer directly
  useEffect(() => {
    if (viewRequestId) {
      const fetchAndOpenRequest = async () => {
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
          const response = await fetch(`/api/requests/${viewRequestId}`);
          if (response.ok) {
            const data = await response.json();
            setSelectedRequest(data);
            setSelectedRequestMatches(data.matches || []);
          } else {
            message.error('Request not found');
            router.replace('/requests');
          }
        } catch (error) {
          console.error('Error fetching request:', error);
          message.error('Failed to load request');
        } finally {
          setDrawerLoading(false);
        }
      };
      fetchAndOpenRequest();
    }
  }, [viewRequestId, message, router]);

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Clear the view param from URL if present
    if (viewRequestId) {
      router.replace('/requests');
    }
  };

  const handleViewRequest = async (request: ServiceRequest) => {
    setSelectedRequest(request);
    setSelectedRequestMatches([]);
    setDrawerOpen(true);
    setDrawerLoading(true);

    try {
      // Fetch full request details including matches
      const response = await fetch(`/api/requests/${request.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data);
        setSelectedRequestMatches(data.matches || []);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleMatchVendors = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setMatchingModalOpen(true);
  };

  const handleStatusChange = async (requestId: string, newStatus: RequestStatus) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        message.success('Status updated');
        fetchRequests();
      } else {
        throw new Error('Failed to update status');
      }
    } catch {
      message.error('Failed to update status');
    }
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value);
    setActivePreset('all');
    setPage(1);
  };

  const handlePresetChange = (preset: FilterPreset) => {
    setActivePreset(preset.key);
    setStatusFilter(preset.filter.status || null);
    setUrgencyFilter(preset.filter.urgency || null);
    setStaleOnly(preset.filter.staleOnly || false);
    setPage(1);
  };

  const handleBulkStatusUpdate = async (newStatus: RequestStatus) => {
    if (selectedRowKeys.length === 0) return;

    setBulkUpdating(true);
    try {
      const results = await Promise.all(
        selectedRowKeys.map(async (id) => {
          const response = await fetch(`/api/requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
          return response.ok;
        })
      );

      const successCount = results.filter(Boolean).length;
      if (successCount === selectedRowKeys.length) {
        message.success(`Updated ${successCount} request(s) to ${REQUEST_STATUS_LABELS[newStatus]}`);
      } else {
        message.warning(`Updated ${successCount} of ${selectedRowKeys.length} requests`);
      }

      setSelectedRowKeys([]);
      fetchRequests();
    } catch (error) {
      console.error('Bulk update error:', error);
      message.error('Failed to update some requests');
    } finally {
      setBulkUpdating(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const handleSaveMedia = async () => {
    if (!selectedRequest) return;

    setSavingMedia(true);
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_urls: mediaUrls }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setSelectedRequest({ ...selectedRequest, media_urls: updatedRequest.media_urls });
        setEditingMedia(false);
        message.success('Media updated successfully');
        fetchRequests();
      } else {
        throw new Error('Failed to update media');
      }
    } catch (error) {
      message.error('Failed to update media');
    } finally {
      setSavingMedia(false);
    }
  };

  const handleStartEditingMedia = () => {
    setMediaUrls(selectedRequest?.media_urls || []);
    setEditingMedia(true);
  };

  const handleCancelEditingMedia = () => {
    setEditingMedia(false);
    setMediaUrls([]);
  };

  const handleResendIntro = async (vendorId: string) => {
    if (!selectedRequest) return;

    setResendingVendorId(vendorId);
    try {
      const response = await fetch(`/api/requests/${selectedRequest.id}/resend-intro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });

      if (response.ok) {
        const result = await response.json();
        message.success('Intro email and SMS resent successfully');
        // Refresh the matches to show updated timestamp
        const matchResponse = await fetch(`/api/requests/${selectedRequest.id}`);
        if (matchResponse.ok) {
          const data = await matchResponse.json();
          setSelectedRequestMatches(data.matches || []);
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend intro');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to resend intro');
    } finally {
      setResendingVendorId(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      // Fetch all requests (no pagination)
      const params = new URLSearchParams({ limit: '10000', offset: '0' });
      if (statusFilter) params.append('status', statusFilter);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await fetch(`/api/requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const { data } = await response.json();

      const csv = objectsToCsv(data, [
        { key: 'id', header: 'ID' },
        { key: 'service_type', header: 'Service Type', formatter: (v) => SERVICE_TYPE_LABELS[v as keyof typeof SERVICE_TYPE_LABELS] || String(v) },
        { key: 'landlord_name', header: 'Landlord Name' },
        { key: 'landlord_email', header: 'Landlord Email' },
        { key: 'landlord_phone', header: 'Landlord Phone' },
        { key: 'property_location', header: 'Location' },
        { key: 'property_address', header: 'Address' },
        { key: 'job_description', header: 'Description' },
        { key: 'urgency', header: 'Urgency', formatter: (v) => URGENCY_LABELS[v as keyof typeof URGENCY_LABELS]?.split(' - ')[0] || String(v) },
        { key: 'status', header: 'Status', formatter: (v) => REQUEST_STATUS_LABELS[v as RequestStatus] || String(v) },
        { key: 'created_at', header: 'Created', formatter: (v) => formatDateTimeForCsv(v as string) },
      ]);

      downloadCsv(csv, `requests-${new Date().toISOString().split('T')[0]}`);
      message.success('Export complete');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export data');
    }
  };

  const columns: ColumnsType<ServiceRequest> = [
    {
      title: 'Priority',
      key: 'priority',
      width: 90,
      render: (_, record) => {
        const age = getRequestAge(record.created_at);
        const isEmergency = record.urgency === 'emergency';
        const isNew = record.status === 'new';

        return (
          <Space orientation="vertical" size={0} style={{ lineHeight: 1.2 }}>
            {isEmergency && (
              <Tag color="red" icon={<ThunderboltOutlined />} style={{ margin: 0 }}>
                URGENT
              </Tag>
            )}
            {!isEmergency && isNew && age.isStale && (
              <Tooltip title="Request is stale - needs attention">
                <Tag color="orange" icon={<ClockCircleOutlined />} style={{ margin: 0 }}>
                  STALE
                </Tag>
              </Tooltip>
            )}
            {!isEmergency && !age.isStale && isNew && (
              <Tag color="blue" style={{ margin: 0 }}>NEW</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type) => SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS] || type,
      width: 150,
    },
    {
      title: 'Landlord',
      key: 'landlord',
      render: (_, record) => (
        <div>
          <div>{record.landlord_name || '-'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.landlord_email}
          </Text>
        </div>
      ),
      width: 200,
    },
    {
      title: 'Location',
      dataIndex: 'property_location',
      key: 'property_location',
      width: 100,
      render: (location, record) => record.zip_code || location,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status as RequestStatus]}>
          {REQUEST_STATUS_LABELS[status as RequestStatus]}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Age',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => {
        const age = getRequestAge(date);
        return (
          <Tooltip title={new Date(date).toLocaleString()}>
            <Text style={{ color: age.color, fontSize: 13 }}>
              {age.text}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewRequest(record)}
          />
          {(record.status === 'new' || record.status === 'matching') && (
            <Button
              size="small"
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => handleMatchVendors(record)}
            >
              Match
            </Button>
          )}
        </Space>
      ),
      width: 150,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Service Requests
          <Badge count={total} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchRequests}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Filter Presets */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap>
            {FILTER_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type={activePreset === preset.key ? 'primary' : 'default'}
                icon={preset.icon}
                onClick={() => handlePresetChange(preset)}
                size="small"
              >
                {preset.label}
              </Button>
            ))}
          </Space>
          <Space wrap>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 130 }}
              value={statusFilter}
              onChange={handleStatusFilterChange}
              options={Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Search
              placeholder="Search..."
              allowClear
              style={{ width: 200 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Space>
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedRowKeys.length > 0 && (
        <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <CheckOutlined style={{ color: '#1890ff' }} />
              <Text strong>{selectedRowKeys.length} request(s) selected</Text>
            </Space>
            <Space>
              <Dropdown
                menu={{
                  items: Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => ({
                    key: value,
                    label: `Mark as ${label}`,
                    onClick: () => handleBulkStatusUpdate(value as RequestStatus),
                  })),
                }}
                trigger={['click']}
              >
                <Button loading={bulkUpdating}>
                  Change Status <DownOutlined />
                </Button>
              </Dropdown>
              <Button onClick={() => setSelectedRowKeys([])}>
                Clear Selection
              </Button>
            </Space>
          </div>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showSizeChanger: true,
            showTotal: (t) => `${t} requests`,
          }}
          scroll={{ x: 1100 }}
          rowClassName={(record) => {
            if (record.urgency === 'emergency') return 'emergency-row';
            const age = getRequestAge(record.created_at);
            if (age.isStale && record.status === 'new') return 'stale-row';
            return '';
          }}
        />
      </Card>

      {/* Custom styles for row highlighting */}
      <style jsx global>{`
        .emergency-row {
          background-color: #fff1f0 !important;
        }
        .emergency-row:hover > td {
          background-color: #ffccc7 !important;
        }
        .stale-row {
          background-color: #fffbe6 !important;
        }
        .stale-row:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>

      {/* Request Details Drawer */}
      <Drawer
        title="Request Details"
        placement="right"
        styles={{ wrapper: { width: 700 } }}
        onClose={handleCloseDrawer}
        open={drawerOpen}
      >
        {selectedRequest && (
          <>
            {/* Status & Actions */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong>Status:</Text>
                <Select
                  value={selectedRequest.status}
                  style={{ width: 150 }}
                  onChange={(value) => handleStatusChange(selectedRequest.id, value)}
                  options={Object.entries(REQUEST_STATUS_LABELS).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                />
              </Space>
              <Button
                type="primary"
                icon={<TeamOutlined />}
                onClick={() => {
                  setDrawerOpen(false);
                  handleMatchVendors(selectedRequest);
                }}
                disabled={selectedRequest.status === 'matched' || selectedRequest.status === 'completed'}
              >
                Match Vendors
              </Button>
            </div>

            <Divider style={{ marginTop: 16, marginBottom: 16 }}>Contact Information</Divider>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Name" span={2}>
                {selectedRequest.first_name && selectedRequest.last_name
                  ? `${selectedRequest.first_name} ${selectedRequest.last_name}`
                  : selectedRequest.landlord_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <a href={`mailto:${selectedRequest.landlord_email}`}>{selectedRequest.landlord_email}</a>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedRequest.landlord_phone ? (
                  <a href={`tel:${selectedRequest.landlord_phone}`}>{selectedRequest.landlord_phone}</a>
                ) : '-'}
              </Descriptions.Item>
              {selectedRequest.contact_preference && (
                <Descriptions.Item label="Preferred Contact">
                  {CONTACT_PREFERENCE_LABELS[selectedRequest.contact_preference]}
                </Descriptions.Item>
              )}
              {selectedRequest.is_owner !== null && (
                <Descriptions.Item label="Owner">
                  {selectedRequest.is_owner ? 'Yes' : 'No (Property Manager)'}
                </Descriptions.Item>
              )}
              {selectedRequest.business_name && (
                <Descriptions.Item label="Business Name" span={2}>
                  {selectedRequest.business_name}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ marginTop: 16, marginBottom: 16 }}>Property Details</Divider>

            <Descriptions column={2} bordered size="small">
              {selectedRequest.property_address && (
                <Descriptions.Item label="Address" span={2}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRequest.property_address + ', Philadelphia, PA')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedRequest.property_address}
                  </a>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Zip Code">
                {selectedRequest.zip_code || selectedRequest.property_location || '-'}
              </Descriptions.Item>
              {selectedRequest.property_type && (
                <Descriptions.Item label="Property Type">
                  {PROPERTY_TYPE_LABELS[selectedRequest.property_type]}
                </Descriptions.Item>
              )}
              {selectedRequest.unit_count && (
                <Descriptions.Item label="Unit Count">
                  {UNIT_COUNT_LABELS[selectedRequest.unit_count]}
                </Descriptions.Item>
              )}
              {selectedRequest.occupancy_status && (
                <Descriptions.Item label="Occupancy">
                  {OCCUPANCY_STATUS_LABELS[selectedRequest.occupancy_status]}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ marginTop: 16, marginBottom: 16 }}>Service Request</Divider>

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Service Type" span={2}>
                <Tag color="blue">{SERVICE_TYPE_LABELS[selectedRequest.service_type]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Urgency">
                <Tag color={urgencyColors[selectedRequest.urgency]}>
                  {URGENCY_LABELS[selectedRequest.urgency]}
                </Tag>
              </Descriptions.Item>
              {selectedRequest.finish_level && (
                <Descriptions.Item label="Finish Level">
                  {FINISH_LEVEL_LABELS[selectedRequest.finish_level]}
                </Descriptions.Item>
              )}
              {selectedRequest.budget_range && (
                <Descriptions.Item label="Budget Range" span={2}>
                  {BUDGET_RANGE_LABELS[selectedRequest.budget_range]}
                </Descriptions.Item>
              )}
              {(selectedRequest.budget_min || selectedRequest.budget_max) && !selectedRequest.budget_range && (
                <Descriptions.Item label="Budget (Legacy)" span={2}>
                  ${selectedRequest.budget_min || 0} - ${selectedRequest.budget_max || '∞'}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Service-specific details */}
            {selectedRequest.service_details && Object.keys(selectedRequest.service_details).length > 0 && (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 16 }}>Service Details</Divider>
                <Descriptions column={1} bordered size="small">
                  {Object.entries(selectedRequest.service_details).map(([key, value]) => (
                    <Descriptions.Item key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                      {value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </>
            )}

            <Divider style={{ marginTop: 16, marginBottom: 16 }}>Job Description</Divider>

            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {selectedRequest.job_description}
            </div>

            {/* Images */}
            <Divider style={{ marginTop: 16, marginBottom: 16 }}>
              <Space>
                <PictureOutlined />
                Images
                {selectedRequest.media_urls && selectedRequest.media_urls.length > 0 && (
                  <Badge count={selectedRequest.media_urls.length} style={{ backgroundColor: '#52c41a' }} />
                )}
              </Space>
            </Divider>

            {editingMedia ? (
              <div>
                <MediaUpload
                  value={mediaUrls}
                  onChange={setMediaUrls}
                  maxFiles={10}
                />
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    onClick={handleSaveMedia}
                    loading={savingMedia}
                  >
                    Save Changes
                  </Button>
                  <Button onClick={handleCancelEditingMedia}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {selectedRequest.media_urls && selectedRequest.media_urls.length > 0 ? (
                  <Image.PreviewGroup>
                    <Row gutter={[8, 8]}>
                      {selectedRequest.media_urls.map((url, index) => (
                        <Col key={index} span={8}>
                          <Image
                            src={url}
                            alt={`Upload ${index + 1}`}
                            style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Image.PreviewGroup>
                ) : (
                  <Text type="secondary">No images uploaded</Text>
                )}
                <div style={{ marginTop: 12 }}>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={handleStartEditingMedia}
                  >
                    {selectedRequest.media_urls && selectedRequest.media_urls.length > 0 ? 'Edit Images' : 'Add Images'}
                  </Button>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selectedRequest.admin_notes && (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 16 }}>Admin Notes</Divider>
                <div style={{ background: '#fffbe6', padding: 16, borderRadius: 8, border: '1px solid #ffe58f' }}>
                  {selectedRequest.admin_notes}
                </div>
              </>
            )}

            {/* Matched Vendors */}
            {drawerLoading ? (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 16 }}>Matched Vendors</Divider>
                <div style={{ textAlign: 'center', padding: 20 }}>Loading...</div>
              </>
            ) : selectedRequestMatches.length > 0 ? (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 16 }}>Matched Vendors ({selectedRequestMatches.length})</Divider>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedRequestMatches.map((match) => (
                    <Card key={match.id} size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Link
                            href={`/vendors?view=${match.vendor_id}`}
                            target="_blank"
                            strong
                          >
                            {match.vendor?.business_name || 'Unknown Vendor'}
                          </Link>
                          <br />
                          <Text type="secondary">{match.vendor?.contact_name}</Text>
                          <br />
                          {match.vendor?.email && (
                            <Link href={`mailto:${match.vendor.email}`}>{match.vendor.email}</Link>
                          )}
                          {match.vendor?.phone && (
                            <>
                              <Text type="secondary"> • </Text>
                              <Link href={`tel:${match.vendor.phone}`}>{match.vendor.phone}</Link>
                            </>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {match.intro_sent && (
                            <Tag color="green">Intro Sent</Tag>
                          )}
                          {match.intro_sent_at && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                              {new Date(match.intro_sent_at).toLocaleString()}
                            </div>
                          )}
                          <Button
                            size="small"
                            icon={<SendOutlined />}
                            onClick={() => handleResendIntro(match.vendor_id)}
                            loading={resendingVendorId === match.vendor_id}
                            style={{ marginTop: 8 }}
                          >
                            Resend
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (selectedRequest.status === 'matched' || selectedRequest.status === 'completed') ? (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 16 }}>Matched Vendors</Divider>
                <Text type="secondary">No match records found</Text>
              </>
            ) : null}

            {/* Metadata */}
            <Divider style={{ marginTop: 16, marginBottom: 16 }}>Metadata</Divider>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Created">
                {new Date(selectedRequest.created_at).toLocaleString()}
              </Descriptions.Item>
              {selectedRequest.intro_sent_at && (
                <Descriptions.Item label="Intro Sent">
                  {new Date(selectedRequest.intro_sent_at).toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedRequest.followup_sent_at && (
                <Descriptions.Item label="Follow-up Sent">
                  {new Date(selectedRequest.followup_sent_at).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>

      {/* Vendor Matching Modal */}
      <VendorMatchingModal
        open={matchingModalOpen}
        request={selectedRequest}
        onClose={() => setMatchingModalOpen(false)}
        onSuccess={() => {
          setMatchingModalOpen(false);
          fetchRequests();
        }}
      />
    </div>
  );
}
