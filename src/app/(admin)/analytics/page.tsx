'use client';

import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Spin, Empty, Segmented, Tag, Tabs, Progress } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  FunnelPlotOutlined,
  DollarOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { SERVICE_TYPE_LABELS, JOB_OUTCOME_REASON_LABELS, JobOutcomeReason } from '@/types/database';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface WeeklyTrendItem {
  week: string;
  requests: number;
  matched: number;
  emergency: number;
}

interface StatusDistributionItem {
  status: string;
  count: number;
}

interface UrgencyDistributionItem {
  urgency: string;
  count: number;
}

interface VendorLeaderboardItem {
  id: string;
  business_name: string;
  matches: number;
  recentMatches: number;
  completedMatches: number;
  successRate: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

interface AnalyticsData {
  requestsThisWeek: number;
  requestsThisMonth: number;
  matchSuccessRate: number;
  avgTimeToMatch: number;
  requestsByServiceType: { service_type: string; count: number }[];
  vendorLeaderboard: VendorLeaderboardItem[];
  weeklyTrend: WeeklyTrendItem[];
  statusDistribution: StatusDistributionItem[];
  urgencyDistribution: UrgencyDistributionItem[];
}

interface ConversionFunnel {
  total_requests: number;
  matched: number;
  matched_rate: number;
  won: number;
  won_rate: number;
  completed: number;
  completed_rate: number;
}

interface ServiceTypeConversion {
  service_type: string;
  service_type_label: string;
  total_requests: number;
  matched: number;
  won: number;
  completed: number;
  match_rate: number;
  conversion_rate: number;
  completion_rate: number;
  avg_time_to_win_hours: number | null;
}

interface VendorConversion {
  vendor_id: string;
  vendor_name: string;
  business_name: string;
  total_matches: number;
  jobs_won: number;
  jobs_completed: number;
  conversion_rate: number;
  completion_rate: number;
  total_revenue: number;
  avg_rating: number | null;
}

interface ConversionData {
  funnel: ConversionFunnel;
  serviceTypeConversions: ServiceTypeConversion[];
  vendorConversions: VendorConversion[];
  lossReasons: Record<string, number>;
}

// Color palette
const COLORS = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
};

const STATUS_COLORS: Record<string, string> = {
  new: COLORS.primary,
  matching: COLORS.warning,
  matched: COLORS.success,
  completed: COLORS.purple,
  cancelled: '#d9d9d9',
};

const URGENCY_COLORS: Record<string, string> = {
  low: '#52c41a',
  medium: '#1677ff',
  high: '#faad14',
  emergency: '#ff4d4f',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  matching: 'Matching',
  matched: 'Matched',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const URGENCY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  emergency: 'Emergency',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [trendView, setTrendView] = useState<'requests' | 'matched' | 'emergency'>('requests');
  const [activeTab, setActiveTab] = useState('overview');

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

  const fetchConversions = useCallback(async () => {
    if (conversionData) return; // Already loaded
    setConversionLoading(true);
    try {
      const res = await fetch('/api/admin/crm/conversions');
      if (res.ok) {
        const data = await res.json();
        setConversionData(data);
      }
    } catch (error) {
      console.error('Error fetching conversions:', error);
    } finally {
      setConversionLoading(false);
    }
  }, [conversionData]);

  useEffect(() => {
    if (activeTab === 'conversions') {
      fetchConversions();
    }
  }, [activeTab, fetchConversions]);

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
      width: 100,
    },
  ];

  const vendorColumns: ColumnsType<VendorLeaderboardItem> = [
    {
      title: 'Rank',
      key: 'rank',
      render: (_, __, index) => {
        const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        return (
          <Tag color={index < 3 ? colors[index] : 'default'} style={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>
            #{index + 1}
          </Tag>
        );
      },
      width: 60,
    },
    {
      title: 'Vendor',
      dataIndex: 'business_name',
      key: 'business_name',
      ellipsis: true,
    },
    {
      title: 'Matches',
      dataIndex: 'matches',
      key: 'matches',
      width: 70,
      render: (matches, record) => (
        <span>
          <Text strong>{matches}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
            ({record.recentMatches} recent)
          </Text>
        </span>
      ),
    },
    {
      title: 'Success',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 70,
      render: (rate) => (
        <Text style={{ color: rate >= 70 ? COLORS.success : rate >= 50 ? COLORS.warning : COLORS.danger }}>
          {rate}%
        </Text>
      ),
    },
    {
      title: 'Trend',
      dataIndex: 'trend',
      key: 'trend',
      width: 60,
      render: (trend: 'up' | 'down' | 'stable') => {
        if (trend === 'up') {
          return <ArrowUpOutlined style={{ color: COLORS.success }} />;
        }
        if (trend === 'down') {
          return <ArrowDownOutlined style={{ color: COLORS.danger }} />;
        }
        return <MinusOutlined style={{ color: '#d9d9d9' }} />;
      },
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 60,
      render: (rating) => (rating ? `${(rating / 20).toFixed(1)}★` : 'N/A'),
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

  // Prepare pie chart data
  const statusPieData = data.statusDistribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: STATUS_LABELS[item.status] || item.status,
      value: item.count,
      color: STATUS_COLORS[item.status] || '#d9d9d9',
    }));

  const urgencyPieData = data.urgencyDistribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: URGENCY_LABELS[item.urgency] || item.urgency,
      value: item.count,
      color: URGENCY_COLORS[item.urgency] || '#d9d9d9',
    }));

  // Prepare bar chart data (top 8 service types)
  const topServiceTypes = data.requestsByServiceType.slice(0, 8).map((item) => ({
    name: (SERVICE_TYPE_LABELS[item.service_type as keyof typeof SERVICE_TYPE_LABELS] || item.service_type).slice(0, 12),
    fullName: SERVICE_TYPE_LABELS[item.service_type as keyof typeof SERVICE_TYPE_LABELS] || item.service_type,
    count: item.count,
  }));

  // Calculate week-over-week change
  const weeklyChange = data.weeklyTrend.length >= 2
    ? data.weeklyTrend[data.weeklyTrend.length - 1].requests - data.weeklyTrend[data.weeklyTrend.length - 2].requests
    : 0;

  const serviceTypeConversionColumns: ColumnsType<ServiceTypeConversion> = [
    {
      title: 'Service Type',
      dataIndex: 'service_type_label',
      key: 'service_type_label',
      width: 150,
    },
    {
      title: 'Requests',
      dataIndex: 'total_requests',
      key: 'total_requests',
      width: 80,
      sorter: (a, b) => a.total_requests - b.total_requests,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Matched',
      key: 'matched',
      width: 100,
      render: (_, record) => (
        <span>
          {record.matched} <Text type="secondary">({record.match_rate}%)</Text>
        </span>
      ),
    },
    {
      title: 'Won',
      key: 'won',
      width: 100,
      render: (_, record) => (
        <span>
          {record.won} <Text type="secondary">({record.conversion_rate}%)</Text>
        </span>
      ),
    },
    {
      title: 'Completed',
      key: 'completed',
      width: 100,
      render: (_, record) => (
        <span>
          {record.completed} <Text type="secondary">({record.completion_rate}%)</Text>
        </span>
      ),
    },
    {
      title: 'Avg Time to Win',
      dataIndex: 'avg_time_to_win_hours',
      key: 'avg_time_to_win',
      width: 120,
      render: (hours: number | null) => (hours !== null ? `${hours}h` : 'N/A'),
    },
  ];

  const vendorConversionColumns: ColumnsType<VendorConversion> = [
    {
      title: 'Rank',
      key: 'rank',
      width: 50,
      render: (_, __, index) => {
        const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        return (
          <Tag color={index < 3 ? colors[index] : 'default'}>
            #{index + 1}
          </Tag>
        );
      },
    },
    {
      title: 'Vendor',
      dataIndex: 'business_name',
      key: 'business_name',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Matches',
      dataIndex: 'total_matches',
      key: 'total_matches',
      width: 80,
    },
    {
      title: 'Won',
      dataIndex: 'jobs_won',
      key: 'jobs_won',
      width: 60,
    },
    {
      title: 'Conv %',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      width: 80,
      render: (rate: number) => (
        <Text style={{ color: rate >= 70 ? COLORS.success : rate >= 50 ? COLORS.warning : COLORS.danger }}>
          {rate}%
        </Text>
      ),
      sorter: (a, b) => a.conversion_rate - b.conversion_rate,
    },
    {
      title: 'Revenue',
      dataIndex: 'total_revenue',
      key: 'total_revenue',
      width: 100,
      render: (revenue: number) => (
        <Text style={{ color: COLORS.success }}>${revenue.toFixed(0)}</Text>
      ),
      sorter: (a, b) => a.total_revenue - b.total_revenue,
    },
    {
      title: 'Rating',
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      width: 70,
      render: (rating: number | null) => (rating ? `${rating.toFixed(1)}★` : 'N/A'),
    },
  ];

  const renderConversionTab = () => {
    if (conversionLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!conversionData) {
      return <Empty description="Unable to load conversion data" />;
    }

    const { funnel, serviceTypeConversions, vendorConversions, lossReasons } = conversionData;

    // Prepare funnel data
    const funnelData = [
      { name: 'Requests', value: funnel.total_requests, fill: COLORS.primary },
      { name: 'Matched', value: funnel.matched, fill: COLORS.cyan },
      { name: 'Won', value: funnel.won, fill: COLORS.purple },
      { name: 'Completed', value: funnel.completed, fill: COLORS.success },
    ];

    // Prepare loss reasons pie data
    const lossReasonData = Object.entries(lossReasons).map(([reason, count]) => ({
      name: JOB_OUTCOME_REASON_LABELS[reason as JobOutcomeReason] || reason,
      value: count,
    }));

    const LOSS_COLORS = ['#ff4d4f', '#ff7a45', '#ffa940', '#ffc53d', '#ffec3d', '#bae637'];

    return (
      <div>
        {/* Funnel Overview */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card title={<><FunnelPlotOutlined style={{ marginRight: 8 }} />Conversion Funnel</>}>
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <Statistic
                    title="Total Requests"
                    value={funnel.total_requests}
                    prefix={<FileTextOutlined />}
                  />
                </Col>
                <Col span={1} style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ transform: 'rotate(90deg)', fontSize: 20, color: '#d9d9d9' }} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="Matched"
                    value={funnel.matched}
                    suffix={<Text type="secondary" style={{ fontSize: 14 }}>({funnel.matched_rate}%)</Text>}
                  />
                </Col>
                <Col span={1} style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ transform: 'rotate(90deg)', fontSize: 20, color: '#d9d9d9' }} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="Won"
                    value={funnel.won}
                    suffix={<Text type="secondary" style={{ fontSize: 14 }}>({funnel.won_rate}%)</Text>}
                    valueStyle={{ color: COLORS.purple }}
                  />
                </Col>
                <Col span={1} style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ transform: 'rotate(90deg)', fontSize: 20, color: '#d9d9d9' }} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="Completed"
                    value={funnel.completed}
                    suffix={<Text type="secondary" style={{ fontSize: 14 }}>({funnel.completed_rate}%)</Text>}
                    valueStyle={{ color: COLORS.success }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={funnel.matched_rate}
                  success={{ percent: (funnel.won / funnel.total_requests) * 100 }}
                  strokeColor={COLORS.cyan}
                  trailColor="#f0f0f0"
                  showInfo={false}
                  style={{ marginBottom: 8 }}
                />
                <Row>
                  <Col span={8}><Text type="secondary">Match Rate: {funnel.matched_rate}%</Text></Col>
                  <Col span={8}><Text type="secondary">Win Rate: {funnel.won_rate}%</Text></Col>
                  <Col span={8}><Text type="secondary">Completion Rate: {funnel.completed_rate}%</Text></Col>
                </Row>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Service Type Conversions & Loss Reasons */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <Card title="Conversion by Service Type">
              <Table
                columns={serviceTypeConversionColumns}
                dataSource={serviceTypeConversions}
                rowKey="service_type"
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Loss Reasons">
              {lossReasonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={lossReasonData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${(name ?? '').slice(0, 15)}${(name ?? '').length > 15 ? '...' : ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {lossReasonData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={LOSS_COLORS[index % LOSS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value ?? 0, 'Jobs']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No loss data yet" style={{ height: 300 }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* Top Converting Vendors */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card
              title={
                <span>
                  <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  Top Converting Vendors
                </span>
              }
            >
              {vendorConversions.length > 0 ? (
                <Table
                  columns={vendorConversionColumns}
                  dataSource={vendorConversions}
                  rowKey="vendor_id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 700 }}
                />
              ) : (
                <Empty description="No vendor conversion data yet" />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div>
      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Requests This Week"
              value={data.requestsThisWeek}
              prefix={<FileTextOutlined />}
              suffix={
                weeklyChange !== 0 && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: weeklyChange > 0 ? COLORS.success : COLORS.danger,
                      marginLeft: 8,
                    }}
                  >
                    {weeklyChange > 0 ? '+' : ''}{weeklyChange}
                  </Text>
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Requests This Month"
              value={data.requestsThisMonth}
              prefix={<RiseOutlined />}
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
              valueStyle={{ color: data.matchSuccessRate >= 70 ? COLORS.success : data.matchSuccessRate >= 50 ? COLORS.warning : COLORS.danger }}
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
              valueStyle={{ color: data.avgTimeToMatch <= 24 ? COLORS.success : data.avgTimeToMatch <= 48 ? COLORS.warning : COLORS.danger }}
            />
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title="Request Volume Trend (Last 12 Weeks)"
            extra={
              <Segmented
                value={trendView}
                onChange={(val) => setTrendView(val as 'requests' | 'matched' | 'emergency')}
                options={[
                  { label: 'All Requests', value: 'requests' },
                  { label: 'Matched', value: 'matched' },
                  { label: 'Emergency', value: 'emergency' },
                ]}
              />
            }
          >
            {data.weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.weeklyTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8 }}
                    formatter={(value) => [value ?? 0, trendView === 'requests' ? 'Requests' : trendView === 'matched' ? 'Matched' : 'Emergency']}
                  />
                  <Line
                    type="monotone"
                    dataKey={trendView}
                    stroke={trendView === 'emergency' ? COLORS.danger : trendView === 'matched' ? COLORS.success : COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: trendView === 'emergency' ? COLORS.danger : trendView === 'matched' ? COLORS.success : COLORS.primary, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No trend data available" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Distribution Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Status Distribution">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value ?? 0, 'Requests']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No status data" style={{ height: 250 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <span>
                <ThunderboltOutlined style={{ marginRight: 8, color: COLORS.warning }} />
                Urgency Distribution
              </span>
            }
          >
            {urgencyPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={urgencyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {urgencyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value ?? 0, 'Requests']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No urgency data" style={{ height: 250 }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Top Service Types">
            {topServiceTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topServiceTypes} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    formatter={(value, _name, props) => [value ?? 0, (props?.payload as { fullName?: string })?.fullName ?? '']}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No service type data" style={{ height: 250 }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="All Requests by Service Type">
            <Table
              columns={serviceTypeColumns}
              dataSource={data.requestsByServiceType}
              rowKey="service_type"
              pagination={{ pageSize: 10, size: 'small' }}
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
            {data.vendorLeaderboard.length > 0 ? (
              <Table
                columns={vendorColumns}
                dataSource={data.vendorLeaderboard}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="No vendor match data yet" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <div>
      <Title level={2}>Analytics Dashboard</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <RiseOutlined />
                Overview
              </span>
            ),
            children: renderOverviewTab(),
          },
          {
            key: 'conversions',
            label: (
              <span>
                <FunnelPlotOutlined />
                Conversions
              </span>
            ),
            children: renderConversionTab(),
          },
        ]}
      />
    </div>
  );
}
