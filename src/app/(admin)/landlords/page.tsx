'use client';

import { useEffect, useState, useCallback } from 'react';
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
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  SearchOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { Landlord } from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

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
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const fetchLandlords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

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
  }, [page, pageSize]);

  useEffect(() => {
    fetchLandlords();
  }, [fetchLandlords]);

  const handleViewLandlord = (landlord: Landlord) => {
    setSelectedLandlord(landlord);
    setSelectedProperty(landlord.properties?.[0] || null);
    setDrawerOpen(true);
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

  const filteredLandlords = landlords.filter((landlord) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      landlord.email.toLowerCase().includes(term) ||
      (landlord.name?.toLowerCase().includes(term) || false) ||
      (landlord.phone?.toLowerCase().includes(term) || false)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Landlords
          <Badge count={total} style={{ marginLeft: 12 }} showZero />
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchLandlords}>
          Refresh
        </Button>
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
          dataSource={filteredLandlords}
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
          </>
        )}
      </Drawer>
    </div>
  );
}
