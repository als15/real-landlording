'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  FilterOutlined,
  DownloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
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

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedRequestMatches, setSelectedRequestMatches] = useState<VendorMatch[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);
  const [resendingVendorId, setResendingVendorId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { message } = App.useApp();

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

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
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
  }, [page, pageSize, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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
    setPage(1); // Reset to first page on filter change
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

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <FilterOutlined />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={handleStatusFilterChange}
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
          dataSource={requests}
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
        styles={{ wrapper: { width: 700 } }}
        onClose={() => setDrawerOpen(false)}
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
            {selectedRequest.media_urls && selectedRequest.media_urls.length > 0 && (
              <>
                <Divider style={{ marginTop: 16, marginBottom: 16 }}>Uploaded Images ({selectedRequest.media_urls.length})</Divider>
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
              </>
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
