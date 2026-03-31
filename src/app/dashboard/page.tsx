'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Button,
  Skeleton,
  Empty,
  Space,
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { REQUEST_STATUS_LABELS } from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { brandColors } from '@/theme/config';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  new: 'blue',
  matching: 'orange',
  matched: 'green',
  completed: 'default',
  cancelled: 'red',
  failed: 'volcano',
};

const chartColors: Record<string, string> = {
  new: '#1890ff',
  matching: '#fa8c16',
  matched: '#52c41a',
  completed: '#8c8c8c',
  cancelled: '#ff4d4f',
  failed: '#fa541c',
};

interface RecentRequest {
  id: string;
  status: string;
  service_type: string;
  property_location: string;
  created_at: string;
  urgency: string;
  match_count: number;
}

interface DashboardData {
  activeRequests: number;
  completedRequests: number;
  totalRequests: number;
  pendingReviews: number;
  avgRating: number | null;
  recentRequests: RecentRequest[];
  statusBreakdown: { status: string; count: number }[];
}

export default function DashboardPage() {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/landlord/dashboard');
        if (response.ok) {
          const json = await response.json();
          setData(json);
        } else if (response.status === 401) {
          window.location.href = '/auth/login?redirectTo=/dashboard';
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Empty state: no requests at all
  if (!loading && data && data.totalRequests === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Empty
          description={
            <Space direction="vertical" size="large">
              <Title level={3} style={{ margin: 0 }}>Welcome to Real Landlording</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                Submit your first service request and we&apos;ll match you with vetted Philadelphia vendors.
              </Text>
              <Link href="/request">
                <Button type="primary" size="large" icon={<PlusOutlined />}>
                  Submit Your First Request
                </Button>
              </Link>
            </Space>
          }
        />
      </div>
    );
  }

  const recentColumns: ColumnsType<RecentRequest> = [
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type: string) => SERVICE_TYPE_LABELS[type] || type,
    },
    {
      title: 'Location',
      dataIndex: 'property_location',
      key: 'property_location',
      ellipsis: true,
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
      render: (count: number) => count > 0 ? <Tag color="green">{count}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const chartData = data?.statusBreakdown.map((item) => ({
    name: REQUEST_STATUS_LABELS[item.status as keyof typeof REQUEST_STATUS_LABELS] || item.status,
    value: item.count,
    color: chartColors[item.status] || '#8c8c8c',
  })) || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Overview of your service requests and vendor matches</Text>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Active Requests"
                value={data?.activeRequests || 0}
                prefix={<ThunderboltOutlined style={{ color: brandColors.secondary }} />}
                valueStyle={{ color: brandColors.secondary }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Completed Jobs"
                value={data?.completedRequests || 0}
                prefix={<CheckCircleOutlined style={{ color: brandColors.primary }} />}
                valueStyle={{ color: brandColors.primary }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Link href="/dashboard/requests?status=matched">
                <Statistic
                  title="Pending Reviews"
                  value={data?.pendingReviews || 0}
                  prefix={<ClockCircleOutlined style={{ color: brandColors.accent }} />}
                  valueStyle={{ color: brandColors.accent, cursor: 'pointer' }}
                />
              </Link>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Avg Vendor Rating"
                value={data?.avgRating || '-'}
                prefix={<StarOutlined style={{ color: brandColors.accent }} />}
                valueStyle={{ color: brandColors.accent }}
                suffix={data?.avgRating ? '/ 5' : ''}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Main Content Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Recent Requests */}
        <Col xs={24} lg={16}>
          <Card
            title="Recent Requests"
            extra={
              <Link href="/dashboard/requests">
                <Button type="link" icon={<ArrowRightOutlined />}>View All</Button>
              </Link>
            }
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <Table
                columns={recentColumns}
                dataSource={data?.recentRequests || []}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
              />
            )}
          </Card>
        </Col>

        {/* Status Chart */}
        <Col xs={24} lg={8}>
          <Card title="Request Status">
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No data yet" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space>
              <Link href="/request">
                <Button type="primary" icon={<PlusOutlined />} size="large">
                  Submit New Request
                </Button>
              </Link>
              {data && data.pendingReviews > 0 && (
                <Link href="/dashboard/requests?status=matched">
                  <Button icon={<StarOutlined />} size="large">
                    Review Pending Vendors ({data.pendingReviews})
                  </Button>
                </Link>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
