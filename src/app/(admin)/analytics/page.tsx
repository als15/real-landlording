'use client';

import { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Spin, Empty, Segmented, Tag, Tabs, Progress, Tooltip as AntTooltip } from 'antd';
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
  AimOutlined,
  QuestionCircleOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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
import { JOB_OUTCOME_REASON_LABELS, JobOutcomeReason } from '@/types/database';
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

const MetricTitle = ({ label, tip }: { label: string; tip: string }) => (
  <span>
    {label}{' '}
    <AntTooltip title={tip}>
      <QuestionCircleOutlined style={{ color: '#bfbfbf', fontSize: 12, cursor: 'help' }} />
    </AntTooltip>
  </span>
);

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

interface VendorApprovalWait {
  pendingCount: number;
  avgPendingWaitDays: number;
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
  vendorApprovalWait: VendorApprovalWait;
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

interface KpiData {
  requestsPerMonth: number;
  activeVendors: number;
  matchSuccessRate: number;
  avgTimeToMatch: number;
  revenuePerMonth: number;
  paymentCollectionRate: number;
  signupConversion: number;
  repeatUsage: number;
}

interface VendorSegmentationData {
  totalVendors: number;
  statusDistribution: { status: string; count: number }[];
  serviceCoverage: { service: string; count: number }[];
  capabilities: { licensed: number; insured: number; rentalExperience: number; emergencyServices: number; total: number };
  performanceTiers: { tier: string; count: number }[];
  availabilityBreakdown: { label: string; count: number }[];
  topServiceAreas: { area: string; count: number }[];
  tenureBuckets: { bucket: string; count: number }[];
  employeeSizeBuckets: { size: string; count: number }[];
  onboardingTrend: { month: string; count: number }[];
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

const VENDOR_STATUS_COLORS: Record<string, string> = {
  active: '#52c41a',
  inactive: '#d9d9d9',
  pending_review: '#faad14',
  rejected: '#ff4d4f',
};

const VENDOR_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending_review: 'Pending Review',
  rejected: 'Rejected',
};

const PERFORMANCE_TIER_COLORS: Record<string, string> = {
  'Elite (80-100)': '#722ed1',
  'Strong (60-79)': '#1677ff',
  'Average (40-59)': '#52c41a',
  'Developing (20-39)': '#faad14',
  'New (0-19)': '#ff7a45',
  'Unscored': '#d9d9d9',
};

export default function AnalyticsPage() {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [vendorSegData, setVendorSegData] = useState<VendorSegmentationData | null>(null);
  const [vendorSegLoading, setVendorSegLoading] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(false);
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

  const fetchKpis = useCallback(async () => {
    if (kpiData) return;
    setKpiLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/kpis');
      if (res.ok) {
        const data = await res.json();
        setKpiData(data);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setKpiLoading(false);
    }
  }, [kpiData]);

  const fetchVendorSegmentation = useCallback(async () => {
    if (vendorSegData) return;
    setVendorSegLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/vendors');
      if (res.ok) {
        const data = await res.json();
        setVendorSegData(data);
      }
    } catch (error) {
      console.error('Error fetching vendor segmentation:', error);
    } finally {
      setVendorSegLoading(false);
    }
  }, [vendorSegData]);

  useEffect(() => {
    if (activeTab === 'conversions') {
      fetchConversions();
    }
    if (activeTab === 'kpis') {
      fetchKpis();
    }
    if (activeTab === 'vendors') {
      fetchVendorSegmentation();
    }
  }, [activeTab, fetchConversions, fetchKpis, fetchVendorSegmentation]);

  const serviceTypeColumns: ColumnsType<{ service_type: string; count: number }> = [
    {
      title: 'Service Type',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (type) => SERVICE_TYPE_LABELS[type ] || type,
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
    name: (SERVICE_TYPE_LABELS[item.service_type ] || item.service_type).slice(0, 12),
    fullName: SERVICE_TYPE_LABELS[item.service_type ] || item.service_type,
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
                    title={<MetricTitle label="Total Requests" tip="All service requests submitted" />}
                    value={funnel.total_requests}
                    prefix={<FileTextOutlined />}
                  />
                </Col>
                <Col span={1} style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ transform: 'rotate(90deg)', fontSize: 20, color: '#d9d9d9' }} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title={<MetricTitle label="Matched" tip="Requests assigned to at least one vendor" />}
                    value={funnel.matched}
                    suffix={<Text type="secondary" style={{ fontSize: 14 }}>({funnel.matched_rate}%)</Text>}
                  />
                </Col>
                <Col span={1} style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ transform: 'rotate(90deg)', fontSize: 20, color: '#d9d9d9' }} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title={<MetricTitle label="Won" tip="Matches where a vendor was chosen by the landlord" />}
                    value={funnel.won}
                    suffix={<Text type="secondary" style={{ fontSize: 14 }}>({funnel.won_rate}%)</Text>}
                    styles={{ content: { color: COLORS.purple } }}
                  />
                </Col>
                <Col span={1} style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ transform: 'rotate(90deg)', fontSize: 20, color: '#d9d9d9' }} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title={<MetricTitle label="Completed" tip="Jobs confirmed finished by the landlord" />}
                    value={funnel.completed}
                    suffix={<Text type="secondary" style={{ fontSize: 14 }}>({funnel.completed_rate}%)</Text>}
                    styles={{ content: { color: COLORS.success } }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={funnel.matched_rate}
                  success={{ percent: (funnel.won / funnel.total_requests) * 100 }}
                  strokeColor={COLORS.cyan}
                  railColor="#f0f0f0"
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
                    <RechartsTooltip formatter={(value) => [value ?? 0, 'Jobs']} />
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

  const renderKpiTab = () => {
    if (kpiLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!kpiData) {
      return <Empty description="Unable to load KPI data" />;
    }

    interface KpiRow {
      key: string;
      metric: string;
      tip: string;
      actual: number;
      format: 'number' | 'percent' | 'hours' | 'currency';
      q2Target: number;
      q3Target: number;
      q4Target: number;
    }

    const requestsQ2 = Math.max(Math.round(kpiData.requestsPerMonth * 1.2), 1);
    const requestsQ3 = Math.max(Math.round(requestsQ2 * 1.3), 1);
    const requestsQ4 = Math.max(Math.round(requestsQ3 * 1.5), 1);

    // Match success: close the gap to 75% ceiling gradually; maintain if already above
    const matchCeiling = 75;
    const matchBase = kpiData.matchSuccessRate;
    const matchGap = Math.max(0, matchCeiling - matchBase);
    const matchQ2 = Math.max(60, Math.round(matchBase + matchGap * 0.4));
    const matchQ3 = Math.max(70, Math.round(matchBase + matchGap * 0.7));
    const matchQ4 = Math.max(75, Math.round(matchBase + matchGap));

    const rows: KpiRow[] = [
      {
        key: 'requests',
        metric: 'Requests / month',
        tip: 'Average monthly request volume',
        actual: kpiData.requestsPerMonth,
        format: 'number',
        q2Target: requestsQ2,
        q3Target: requestsQ3,
        q4Target: requestsQ4,
      },
      {
        key: 'vendors',
        metric: 'Active vendors',
        tip: 'Vendors with active status available for matching',
        actual: kpiData.activeVendors,
        format: 'number',
        q2Target: kpiData.activeVendors + 10,
        q3Target: kpiData.activeVendors + 20,
        q4Target: kpiData.activeVendors + 30,
      },
      {
        key: 'matchSuccess',
        metric: 'Match success rate',
        tip: 'Percentage of matched requests reaching completion',
        actual: kpiData.matchSuccessRate,
        format: 'percent',
        q2Target: matchQ2,
        q3Target: matchQ3,
        q4Target: matchQ4,
      },
      {
        key: 'timeToMatch',
        metric: 'Avg time to match',
        tip: 'Hours from request submission to first vendor assignment',
        actual: kpiData.avgTimeToMatch,
        format: 'hours',
        q2Target: kpiData.avgTimeToMatch > 0 ? Math.min(8, kpiData.avgTimeToMatch) : 8,
        q3Target: kpiData.avgTimeToMatch > 0 ? Math.min(4, kpiData.avgTimeToMatch) : 4,
        q4Target: kpiData.avgTimeToMatch > 0 ? Math.min(4, kpiData.avgTimeToMatch) : 4,
      },
      {
        key: 'revenue',
        metric: 'Referral revenue / month',
        tip: 'Monthly income from vendor referral fees',
        actual: kpiData.revenuePerMonth,
        format: 'currency',
        q2Target: 1,
        q3Target: 2000,
        q4Target: 4000,
      },
      {
        key: 'collection',
        metric: 'Payment collection rate',
        tip: 'Percentage of invoiced referral fees collected',
        actual: kpiData.paymentCollectionRate,
        format: 'percent',
        q2Target: Math.max(50, kpiData.paymentCollectionRate),
        q3Target: Math.max(70, kpiData.paymentCollectionRate),
        q4Target: Math.max(80, kpiData.paymentCollectionRate),
      },
      {
        key: 'signup',
        metric: 'Signup conversion',
        tip: 'Percentage of request submitters who create accounts',
        actual: kpiData.signupConversion,
        format: 'percent',
        q2Target: Math.max(20, kpiData.signupConversion),
        q3Target: Math.max(30, kpiData.signupConversion),
        q4Target: Math.max(35, kpiData.signupConversion),
      },
      {
        key: 'repeat',
        metric: 'Landlord repeat usage',
        tip: 'Percentage of landlords who submit more than one request',
        actual: kpiData.repeatUsage,
        format: 'percent',
        q2Target: Math.max(25, kpiData.repeatUsage),
        q3Target: Math.max(35, kpiData.repeatUsage),
        q4Target: Math.max(40, kpiData.repeatUsage),
      },
    ];

    const formatValue = (value: number, format: KpiRow['format']) => {
      switch (format) {
        case 'percent': return `${value}%`;
        case 'hours': return `${value}h`;
        case 'currency': return `$${value.toLocaleString()}`;
        default: return value.toLocaleString();
      }
    };

    const getStatus = (row: KpiRow): { label: string; color: string } => {
      // For time-to-match, lower is better
      if (row.key === 'timeToMatch') {
        if (row.actual <= row.q2Target) return { label: 'On Track', color: 'green' };
        if (row.actual <= row.q2Target * 1.5) return { label: 'Close', color: 'orange' };
        return { label: 'Behind', color: 'red' };
      }
      // For revenue Q2 target of $1 — any revenue means met
      if (row.key === 'revenue') {
        if (row.actual >= row.q2Target) return { label: 'On Track', color: 'green' };
        return { label: 'Behind', color: 'red' };
      }
      // Standard: higher is better
      if (row.actual >= row.q2Target) return { label: 'On Track', color: 'green' };
      if (row.actual >= row.q2Target * 0.7) return { label: 'Close', color: 'orange' };
      return { label: 'Behind', color: 'red' };
    };

    const getProgress = (row: KpiRow): number => {
      if (row.q2Target === 0) return 100;
      // For time-to-match, invert: being under target is good
      if (row.key === 'timeToMatch') {
        if (row.actual <= row.q2Target) return 100;
        // Scale: at 2x target = 0%, at target = 100%
        return Math.max(0, Math.round((1 - (row.actual - row.q2Target) / row.q2Target) * 100));
      }
      return Math.min(100, Math.round((row.actual / row.q2Target) * 100));
    };

    const kpiColumns: ColumnsType<KpiRow> = [
      {
        title: 'Metric',
        dataIndex: 'metric',
        key: 'metric',
        width: 200,
        render: (_text: string, row: KpiRow) => (
          <Text strong>
            {row.metric}{' '}
            <AntTooltip title={row.tip}>
              <QuestionCircleOutlined style={{ color: '#bfbfbf', fontSize: 12, cursor: 'help' }} />
            </AntTooltip>
          </Text>
        ),
      },
      {
        title: <span>Q1 Baseline<br /><Text type="secondary" style={{ fontSize: 11, fontWeight: 'normal' }}>Jan – Mar</Text></span>,
        key: 'actual',
        width: 140,
        render: (_, row) => (
          <Text strong style={{ fontSize: 16 }}>{formatValue(row.actual, row.format)}</Text>
        ),
      },
      {
        title: <span>Q2 Target<br /><Text type="secondary" style={{ fontSize: 11, fontWeight: 'normal' }}>Apr – Jun</Text></span>,
        key: 'q2',
        width: 140,
        render: (_, row) => {
          const progress = getProgress(row);
          const status = getStatus(row);
          const strokeColor = status.color === 'green' ? '#52c41a' : status.color === 'orange' ? '#fa8c16' : '#ff4d4f';
          return (
            <div>
              <div>{row.key === 'revenue' && row.q2Target === 1
                ? <Text type="secondary">{'>$0'}</Text>
                : <Text type="secondary">{formatValue(row.q2Target, row.format)}</Text>
              }</div>
              <Progress
                percent={progress}
                size="small"
                strokeColor={strokeColor}
                showInfo={false}
              />
            </div>
          );
        },
      },
      {
        title: <span>Q3 Target<br /><Text type="secondary" style={{ fontSize: 11, fontWeight: 'normal' }}>Jul – Sep</Text></span>,
        key: 'q3',
        width: 100,
        render: (_, row) => <Text type="secondary">{formatValue(row.q3Target, row.format)}</Text>,
      },
      {
        title: <span>Q4 Target<br /><Text type="secondary" style={{ fontSize: 11, fontWeight: 'normal' }}>Oct – Dec</Text></span>,
        key: 'q4',
        width: 100,
        render: (_, row) => <Text type="secondary">{formatValue(row.q4Target, row.format)}</Text>,
      },
      {
        title: 'Status',
        key: 'status',
        width: 100,
        render: (_, row) => {
          const status = getStatus(row);
          return <Tag color={status.color}>{status.label}</Tag>;
        },
      },
    ];

    return (
      <Card title={<><AimOutlined style={{ marginRight: 8 }} />Quarterly KPI Targets — 2026</>}>
        <Table
          columns={kpiColumns}
          dataSource={rows}
          rowKey="key"
          pagination={false}
          size="middle"
        />
      </Card>
    );
  };

  const renderVendorsTab = () => {
    if (vendorSegLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!vendorSegData) {
      return <Empty description="Unable to load vendor segmentation data" />;
    }

    const {
      totalVendors,
      statusDistribution,
      serviceCoverage,
      capabilities,
      performanceTiers,
      tenureBuckets,
    } = vendorSegData;

    const statusPie = statusDistribution.map((item) => ({
      name: VENDOR_STATUS_LABELS[item.status] || item.status,
      value: item.count,
      color: VENDOR_STATUS_COLORS[item.status] || '#d9d9d9',
    }));

    const capabilityData = [
      { name: 'Licensed', value: capabilities.licensed, pct: capabilities.total > 0 ? Math.round((capabilities.licensed / capabilities.total) * 100) : 0 },
      { name: 'Insured', value: capabilities.insured, pct: capabilities.total > 0 ? Math.round((capabilities.insured / capabilities.total) * 100) : 0 },
      { name: 'Rental Exp.', value: capabilities.rentalExperience, pct: capabilities.total > 0 ? Math.round((capabilities.rentalExperience / capabilities.total) * 100) : 0 },
      { name: 'Emergency', value: capabilities.emergencyServices, pct: capabilities.total > 0 ? Math.round((capabilities.emergencyServices / capabilities.total) * 100) : 0 },
    ];

    const topServices = serviceCoverage.slice(0, 20).map((item) => ({
      service: item.service,
      label: SERVICE_TYPE_LABELS[item.service] || item.service,
      count: item.count,
    }));

    const CAPABILITY_COLORS = ['#1677ff', '#52c41a', '#722ed1', '#ff4d4f'];

    return (
      <div>
        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={<MetricTitle label="Total Vendors" tip="All vendors in the system regardless of status" />}
                value={totalVendors}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={<MetricTitle label="Active Vendors" tip="Vendors currently available for matching" />}
                value={capabilities.total}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: COLORS.success } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={<MetricTitle label="Service Types Covered" tip="Distinct service categories offered by active vendors" />}
                value={serviceCoverage.length}
                prefix={<SafetyCertificateOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={<MetricTitle label="Licensed & Insured" tip="Active vendors that are both licensed and insured" />}
                value={capabilities.total > 0 ? Math.round((Math.min(capabilities.licensed, capabilities.insured) / capabilities.total) * 100) : 0}
                suffix="%"
                prefix={<SafetyCertificateOutlined />}
                styles={{ content: { color: COLORS.success } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Status + Performance Tiers */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={8}>
            <Card title="Vendor Status Distribution">
              {statusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [value ?? 0, 'Vendors']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No vendor data" style={{ height: 280 }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Performance Tiers (Active Vendors)">
              {performanceTiers.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={performanceTiers} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis dataKey="tier" type="category" tick={{ fontSize: 11 }} width={110} />
                    <RechartsTooltip formatter={(value) => [value ?? 0, 'Vendors']} contentStyle={{ borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {performanceTiers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PERFORMANCE_TIER_COLORS[entry.tier] || COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No performance data" style={{ height: 280 }} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Business Tenure (Active Vendors)">
              {tenureBuckets.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={tenureBuckets.map((t) => ({ name: t.bucket, value: t.count }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {tenureBuckets.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={[COLORS.purple, COLORS.primary, COLORS.success, COLORS.warning, '#d9d9d9'][index % 5]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [value ?? 0, 'Vendors']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="No tenure data" style={{ height: 280 }} />
              )}
            </Card>
          </Col>
        </Row>

        {/* Service Coverage + Capabilities */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Service Coverage (Top 20)">
              {topServices.length > 0 ? (
                <Table
                  dataSource={topServices}
                  rowKey="service"
                  pagination={{ pageSize: 10, size: 'small' }}
                  size="small"
                  columns={[
                    { title: 'Service Type', dataIndex: 'label', key: 'label' },
                    {
                      title: 'Vendors',
                      dataIndex: 'count',
                      key: 'count',
                      width: 80,
                      sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
                      defaultSortOrder: 'descend' as const,
                    },
                  ]}
                />
              ) : (
                <Empty description="No service data" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Vendor Capabilities (Active Vendors)">
              <div style={{ padding: '8px 0' }}>
                {capabilityData.map((cap, i) => (
                  <div key={cap.name} style={{ marginBottom: 16 }}>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Text strong>{cap.name}</Text>
                      <Text type="secondary">{cap.value} / {capabilities.total} ({cap.pct}%)</Text>
                    </Row>
                    <Progress
                      percent={cap.pct}
                      strokeColor={CAPABILITY_COLORS[i]}
                      showInfo={false}
                    />
                  </div>
                ))}
              </div>
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
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={<MetricTitle label="Requests This Week" tip="New service requests submitted in the current week" />}
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
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={<MetricTitle label="Requests This Month" tip="Total service requests submitted this calendar month" />}
              value={data.requestsThisMonth}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={<MetricTitle label="Match Success Rate" tip="Percentage of matched requests that reached completion" />}
              value={data.matchSuccessRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: data.matchSuccessRate >= 70 ? COLORS.success : data.matchSuccessRate >= 50 ? COLORS.warning : COLORS.danger } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={<MetricTitle label="Avg. Time to Match" tip="Average hours from request submission to vendor match" />}
              value={data.avgTimeToMatch}
              suffix="hours"
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: data.avgTimeToMatch <= 24 ? COLORS.success : data.avgTimeToMatch <= 48 ? COLORS.warning : COLORS.danger } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={<MetricTitle label="Pending Vendors" tip="Vendor applications awaiting admin review" />}
              value={data.vendorApprovalWait.pendingCount}
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: data.vendorApprovalWait.pendingCount > 0 ? COLORS.warning : COLORS.success } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={<MetricTitle label="Avg. Approval Wait" tip="Average days vendors wait for application approval" />}
              value={data.vendorApprovalWait.avgPendingWaitDays}
              suffix="days"
              prefix={<ClockCircleOutlined />}
              styles={{ content: { color: data.vendorApprovalWait.avgPendingWaitDays <= 3 ? COLORS.success : data.vendorApprovalWait.avgPendingWaitDays <= 7 ? COLORS.warning : COLORS.danger } }}
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
                  <RechartsTooltip
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
                  <RechartsTooltip formatter={(value) => [value ?? 0, 'Requests']} />
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
                  <RechartsTooltip formatter={(value) => [value ?? 0, 'Requests']} />
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
                  <RechartsTooltip
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
          {
            key: 'vendors',
            label: (
              <span>
                <TeamOutlined />
                Vendors
              </span>
            ),
            children: renderVendorsTab(),
          },
          {
            key: 'kpis',
            label: (
              <span>
                <AimOutlined />
                KPIs
              </span>
            ),
            children: renderKpiTab(),
          },
        ]}
      />
    </div>
  );
}
