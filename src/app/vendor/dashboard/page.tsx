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
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  StarOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
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

const chartColors: Record<string, string> = {
  pending: '#fa8c16',
  intro_sent: '#1890ff',
  estimate_sent: '#13c2c2',
  vendor_accepted: '#52c41a',
  vendor_declined: '#ff4d4f',
  no_response: '#8c8c8c',
  in_progress: '#2f54eb',
  completed: '#4b7557',
  cancelled: '#d9d9d9',
  no_show: '#fa541c',
};

interface RecentJob {
  id: string;
  status: string;
  service_type: string;
  property_location: string;
  created_at: string;
}

interface VendorDashboardData {
  totalJobs: number;
  pendingJobs: number;
  acceptedJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  averageRating: number;
  totalReviews: number;
  statusBreakdown: { status: string; count: number }[];
  recentJobs: RecentJob[];
}

export default function VendorDashboardPage() {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const [data, setData] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/vendor/stats');
        if (response.ok) {
          const json = await response.json();
          setData(json);
        } else if (response.status === 401) {
          window.location.href = '/vendor/login?redirectTo=/vendor/dashboard';
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Empty state: no jobs at all
  if (!loading && data && data.totalJobs === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Empty
          description={
            <Space direction="vertical" size="large">
              <Title level={3} style={{ margin: 0 }}>Welcome to Real Landlording</Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                No jobs assigned yet. You&apos;ll see referrals here when landlords need your services.
              </Text>
              <Text type="secondary">
                Make sure your profile is complete to increase your chances of being matched.
              </Text>
              <Link href="/vendor/dashboard/profile">
                <Button type="primary" size="large">
                  Complete My Profile
                </Button>
              </Link>
            </Space>
          }
        />
      </div>
    );
  }

  const recentColumns: ColumnsType<RecentJob> = [
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
        <Tag color={MATCH_STATUS_COLORS[status]}>
          {MATCH_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const chartData = data?.statusBreakdown.map((item) => ({
    name: MATCH_STATUS_LABELS[item.status] || item.status,
    value: item.count,
    color: chartColors[item.status] || '#8c8c8c',
  })) || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Vendor Dashboard</Title>
        <Text type="secondary">Overview of your job referrals and performance</Text>
      </div>

      {/* Stat Cards - 6 across */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Total Jobs"
                value={data?.totalJobs || 0}
                prefix={<FileTextOutlined style={{ color: brandColors.secondary }} />}
                valueStyle={{ color: brandColors.secondary }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Link href="/vendor/dashboard/jobs?status=pending">
                <Statistic
                  title="Pending"
                  value={data?.pendingJobs || 0}
                  prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14', cursor: 'pointer' }}
                />
              </Link>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Accepted"
                value={data?.acceptedJobs || 0}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="In Progress"
                value={data?.inProgressJobs || 0}
                prefix={<PlayCircleOutlined style={{ color: '#2f54eb' }} />}
                valueStyle={{ color: '#2f54eb' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Completed"
                value={data?.completedJobs || 0}
                prefix={<CheckCircleOutlined style={{ color: brandColors.primary }} />}
                valueStyle={{ color: brandColors.primary }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            {loading ? (
              <Skeleton.Button active block style={{ height: 60 }} />
            ) : (
              <Statistic
                title="Avg Rating"
                value={data?.averageRating ? data.averageRating.toFixed(1) : '-'}
                prefix={<StarOutlined style={{ color: brandColors.accent }} />}
                valueStyle={{ color: brandColors.accent }}
                suffix={data?.averageRating ? `/ 5 (${data.totalReviews})` : ''}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Main Content Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Recent Jobs */}
        <Col xs={24} lg={16}>
          <Card
            title="Recent Jobs"
            extra={
              <Link href="/vendor/dashboard/jobs">
                <Button type="link" icon={<ArrowRightOutlined />}>View All</Button>
              </Link>
            }
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : data?.recentJobs && data.recentJobs.length > 0 ? (
              <Table
                columns={recentColumns}
                dataSource={data.recentJobs}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
              />
            ) : (
              <Empty description="No recent jobs" />
            )}
          </Card>
        </Col>

        {/* Status Chart */}
        <Col xs={24} lg={8}>
          <Card title="Job Status">
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
            <Space wrap>
              {data && data.pendingJobs > 0 && (
                <Link href="/vendor/dashboard/jobs?status=pending">
                  <Button type="primary" icon={<ThunderboltOutlined />} size="large">
                    {data.pendingJobs} Job{data.pendingJobs !== 1 ? 's' : ''} Need Your Response
                  </Button>
                </Link>
              )}
              <Link href="/vendor/dashboard/jobs">
                <Button icon={<FileTextOutlined />} size="large">
                  View All Jobs
                </Button>
              </Link>
              <Link href="/vendor/dashboard/profile">
                <Button size="large">
                  My Profile
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Pending jobs alert */}
      {data && data.pendingJobs > 0 && (
        <Alert
          message={`You have ${data.pendingJobs} pending job${data.pendingJobs !== 1 ? 's' : ''} awaiting your response`}
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          action={
            <Link href="/vendor/dashboard/jobs?status=pending">
              <Button size="small" type="link">Respond Now</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
