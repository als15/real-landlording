'use client';

import { useEffect, useState, useCallback } from 'react';
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
  message,
  Badge,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import {
  ServiceRequest,
  RequestStatus,
  REQUEST_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  URGENCY_LABELS,
} from '@/types/database';
import type { ColumnsType } from 'antd/es/table';
import VendorMatchingModal from '@/components/admin/VendorMatchingModal';

const { Title, Text } = Typography;
const { Search } = Input;

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

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);

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

      const response = await fetch(`/api/requests?${params}`);
      if (response.ok) {
        const { data, count } = await response.json();
        setRequests(data || []);
        setTotal(count || 0);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      message.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleViewRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setDrawerOpen(true);
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

  const columns: ColumnsType<ServiceRequest> = [
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type) => SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS] || type,
      width: 180,
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
      width: 120,
    },
    {
      title: 'Urgency',
      dataIndex: 'urgency',
      key: 'urgency',
      render: (urgency) => (
        <Tag color={urgencyColors[urgency]}>
          {URGENCY_LABELS[urgency as keyof typeof URGENCY_LABELS]?.split(' - ')[0] || urgency}
        </Tag>
      ),
      width: 100,
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
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
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

  const filteredRequests = requests.filter((request) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      request.landlord_email.toLowerCase().includes(term) ||
      (request.landlord_name?.toLowerCase().includes(term) || false) ||
      request.property_location.toLowerCase().includes(term) ||
      request.job_description.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Service Requests
          <Badge count={total} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchRequests}>
          Refresh
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <FilterOutlined />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Search
            placeholder="Search requests..."
            allowClear
            style={{ width: 300 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredRequests}
          rowKey="id"
          loading={loading}
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
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Request Details Drawer */}
      <Drawer
        title="Request Details"
        placement="right"
        width={600}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedRequest && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Status">
                <Select
                  value={selectedRequest.status}
                  style={{ width: 150 }}
                  onChange={(value) => handleStatusChange(selectedRequest.id, value)}
                  options={Object.entries(REQUEST_STATUS_LABELS).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Service Type">
                {SERVICE_TYPE_LABELS[selectedRequest.service_type]}
              </Descriptions.Item>
              <Descriptions.Item label="Urgency">
                <Tag color={urgencyColors[selectedRequest.urgency]}>
                  {URGENCY_LABELS[selectedRequest.urgency]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Property Location">
                {selectedRequest.property_location}
              </Descriptions.Item>
              {selectedRequest.budget_min || selectedRequest.budget_max ? (
                <Descriptions.Item label="Budget">
                  ${selectedRequest.budget_min || 0} - ${selectedRequest.budget_max || '∞'}
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            <Divider>Contact Information</Divider>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Name">
                {selectedRequest.landlord_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedRequest.landlord_email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedRequest.landlord_phone || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Job Description</Divider>

            <Text>{selectedRequest.job_description}</Text>

            <Divider />

            <Space>
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
            </Space>
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
