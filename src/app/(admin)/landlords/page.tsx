'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Input,
  Badge,
  Drawer,
  Descriptions,
  Divider,
  Empty,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  DownloadOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Landlord, ServiceRequest, RequestVendorMatch, SERVICE_TYPE_LABELS, REQUEST_STATUS_LABELS, RequestStatus, URGENCY_LABELS, UrgencyLevel } from '@/types/database';
import {
  objectsToCsv,
  downloadCsv,
  formatDateTimeForCsv,
  formatArrayForCsv,
} from '@/lib/utils/csv-export';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// Extended landlord type with requests
interface LandlordWithRequests extends Landlord {
  requests?: (ServiceRequest & {
    matches?: RequestVendorMatch[];
  })[];
}

function PropertyMap({ address }: { address: string }) {
  const fullAddress = address + ', Philadelphia, PA';
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  return (
    <div>
      <iframe
        width="100%"
        height="250"
        style={{ border: 0, borderRadius: 8 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
      />
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}

export default function LandlordsPage() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordWithRequests | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [loadingLandlordDetails, setLoadingLandlordDetails] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchLandlords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/admin/landlords?${params}`);
      if (response.ok) {
        const { data, count } = await response.json();
        setLandlords(data || []);
        setTotal(count || 0);
      }
    } catch (error) {
      console.error('Error fetching landlords:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchLandlords();
  }, [fetchLandlords]);

  const handleViewLandlord = async (landlord: Landlord) => {
    setSelectedLandlord(landlord); // Show drawer immediately with basic data
    setSelectedProperty(landlord.properties?.[0] || null);
    setDrawerOpen(true);
    setLoadingLandlordDetails(true);

    try {
      const response = await fetch(`/api/admin/landlords/${landlord.id}`);
      if (response.ok) {
        const landlordWithRequests = await response.json();
        setSelectedLandlord(landlordWithRequests);
      }
    } catch (error) {
      console.error('Error fetching landlord details:', error);
    } finally {
      setLoadingLandlordDetails(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams({ limit: '10000', offset: '0' });
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await fetch(`/api/admin/landlords?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const { data } = await response.json();

      const csv = objectsToCsv(data, [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'properties', header: 'Properties', formatter: (v) => formatArrayForCsv(v as unknown as string[]) },
        { key: 'request_count', header: 'Request Count' },
        { key: 'created_at', header: 'Created', formatter: (v) => formatDateTimeForCsv(v as string) },
      ]);

      downloadCsv(csv, `landlords-${new Date().toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const columns: ColumnsType<Landlord> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => name || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Requests',
      dataIndex: 'request_count',
      key: 'request_count',
      render: (count) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      ),
      sorter: (a, b) => a.request_count - b.request_count,
    },
    {
      title: 'Account',
      key: 'account',
      render: (_, record) => (
        record.auth_user_id ? (
          <Tag color="green">Registered</Tag>
        ) : (
          <Tag>Email Only</Tag>
        )
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewLandlord(record)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Landlords
          <Badge count={total} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchLandlords}>
            Refresh
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <SearchOutlined />
          <Input.Search
            placeholder="Search by name, email, or phone..."
            allowClear
            style={{ width: 400 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={landlords}
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
            showTotal: (t) => `${t} landlords`,
          }}
        />
      </Card>

      {/* Landlord Details Drawer */}
      <Drawer
        title="Landlord Details"
        placement="right"
        width={500}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedLandlord && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Name">
                {selectedLandlord.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedLandlord.email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedLandlord.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                {selectedLandlord.auth_user_id ? (
                  <Tag color="green">Registered</Tag>
                ) : (
                  <Tag>Email Only</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Subscription">
                <Tag>{selectedLandlord.subscription_tier || 'Basic'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Request Count">
                {selectedLandlord.request_count}
              </Descriptions.Item>
              <Descriptions.Item label="Joined">
                {new Date(selectedLandlord.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {selectedLandlord.properties && selectedLandlord.properties.length > 0 && (
              <>
                <Divider><EnvironmentOutlined /> Properties</Divider>
                <Space wrap style={{ marginBottom: 16 }}>
                  {selectedLandlord.properties.map((prop, i) => (
                    <Tag
                      key={i}
                      color={selectedProperty === prop ? 'blue' : 'default'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedProperty(prop)}
                    >
                      {prop}
                    </Tag>
                  ))}
                </Space>
                {selectedProperty && (
                  <PropertyMap address={selectedProperty} />
                )}
              </>
            )}
            {(!selectedLandlord.properties || selectedLandlord.properties.length === 0) && (
              <>
                <Divider><EnvironmentOutlined /> Properties</Divider>
                <Empty description="No properties on file" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </>
            )}

            <Divider><FileTextOutlined /> Service Requests</Divider>

            {loadingLandlordDetails ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin />
              </div>
            ) : selectedLandlord.requests && selectedLandlord.requests.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {selectedLandlord.requests
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((request) => (
                    <Card
                      key={request.id}
                      size="small"
                      style={{ marginBottom: 8 }}
                      title={
                        <Space>
                          <Tag color="blue">
                            {SERVICE_TYPE_LABELS[request.service_type as keyof typeof SERVICE_TYPE_LABELS] || request.service_type}
                          </Tag>
                          <Tag color={
                            request.status === 'completed' ? 'success' :
                            request.status === 'matched' ? 'processing' :
                            request.status === 'cancelled' ? 'error' : 'default'
                          }>
                            {REQUEST_STATUS_LABELS[request.status as RequestStatus]}
                          </Tag>
                        </Space>
                      }
                      extra={
                        <Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(request.created_at).toLocaleDateString()}
                          </Text>
                          <Button
                            type="link"
                            size="small"
                            icon={<ArrowRightOutlined />}
                            href={`/requests?view=${request.id}`}
                            target="_blank"
                          />
                        </Space>
                      }
                    >
                      <Descriptions size="small" column={1}>
                        <Descriptions.Item label="Location">
                          {request.property_address || request.property_location || '-'}
                          {request.zip_code && ` (${request.zip_code})`}
                        </Descriptions.Item>
                        <Descriptions.Item label="Urgency">
                          <Tag color={request.urgency === 'emergency' ? 'red' : request.urgency === 'high' ? 'orange' : 'default'}>
                            {URGENCY_LABELS[request.urgency as UrgencyLevel]}
                          </Tag>
                        </Descriptions.Item>
                        {request.matches && request.matches.length > 0 && (
                          <Descriptions.Item label="Vendors Matched">
                            <Tag color="green">{request.matches.length} vendor{request.matches.length > 1 ? 's' : ''}</Tag>
                          </Descriptions.Item>
                        )}
                        {request.intro_sent_at && (
                          <Descriptions.Item label="Intro Sent">
                            {new Date(request.intro_sent_at).toLocaleDateString()}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                      {request.job_description && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                          {request.job_description.length > 100
                            ? `${request.job_description.substring(0, 100)}...`
                            : request.job_description}
                        </Text>
                      )}
                    </Card>
                  ))}
              </div>
            ) : (
              <Empty description="No requests submitted" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
