'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { ServiceRequest, REQUEST_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/types/database';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';

const { Title } = Typography;

interface DashboardStats {
  totalRequests: number;
  newRequests: number;
  totalVendors: number;
  totalLandlords: number;
}

const statusColors: Record<string, string> = {
  new: 'blue',
  matching: 'orange',
  matched: 'green',
  completed: 'default',
  cancelled: 'red',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    newRequests: 0,
    totalVendors: 0,
    totalLandlords: 0,
  });
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [requestsRes, statsRes] = await Promise.all([
          fetch('/api/requests?limit=5'),
          fetch('/api/admin/stats'),
        ]);

        if (requestsRes.ok) {
          const { data } = await requestsRes.json();
          setRecentRequests(data || []);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const columns: ColumnsType<ServiceRequest> = [
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type) => SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS] || type,
    },
    {
      title: 'Landlord',
      dataIndex: 'landlord_name',
      key: 'landlord_name',
      render: (name, record) => name || record.landlord_email,
    },
    {
      title: 'Location',
      dataIndex: 'property_location',
      key: 'property_location',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>
          {REQUEST_STATUS_LABELS[status as keyof typeof REQUEST_STATUS_LABELS]}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
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
      <Title level={2}>Dashboard</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Requests"
              value={stats.totalRequests}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="New Requests"
              value={stats.newRequests}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Vendors"
              value={stats.totalVendors}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Landlords"
              value={stats.totalLandlords}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Recent Requests"
        extra={<Link href="/requests">View All</Link>}
      >
        <Table
          columns={columns}
          dataSource={recentRequests}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
