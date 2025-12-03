'use client';

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Spin, Empty } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { SERVICE_TYPE_LABELS } from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface AnalyticsData {
  requestsThisWeek: number;
  requestsThisMonth: number;
  matchSuccessRate: number;
  avgTimeToMatch: number;
  requestsByServiceType: { service_type: string; count: number }[];
  vendorLeaderboard: { id: string; business_name: string; matches: number; rating: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const analyticsData = await res.json();
          setData(analyticsData);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  const serviceTypeColumns: ColumnsType<{ service_type: string; count: number }> = [
    {
      title: 'Service Type',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type) => SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS] || type,
    },
    {
      title: 'Requests',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
    },
  ];

  const vendorColumns: ColumnsType<{ id: string; business_name: string; matches: number; rating: number }> = [
    {
      title: 'Rank',
      key: 'rank',
      render: (_, __, index) => index + 1,
      width: 60,
    },
    {
      title: 'Vendor',
      dataIndex: 'business_name',
      key: 'business_name',
    },
    {
      title: 'Matches',
      dataIndex: 'matches',
      key: 'matches',
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => (rating ? `${rating.toFixed(1)} / 5` : 'N/A'),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Title level={2}>Analytics</Title>
        <Empty description="Unable to load analytics data" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Analytics</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Requests This Week"
              value={data.requestsThisWeek}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Requests This Month"
              value={data.requestsThisMonth}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Match Success Rate"
              value={data.matchSuccessRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: data.matchSuccessRate >= 70 ? '#3f8600' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg. Time to Match"
              value={data.avgTimeToMatch}
              suffix="hours"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Requests by Service Type">
            <Table
              columns={serviceTypeColumns}
              dataSource={data.requestsByServiceType}
              rowKey="service_type"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
                Vendor Leaderboard
              </span>
            }
          >
            <Table
              columns={vendorColumns}
              dataSource={data.vendorLeaderboard}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
