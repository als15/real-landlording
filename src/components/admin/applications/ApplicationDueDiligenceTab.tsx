'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Alert,
  Tag,
  Typography,
  Divider,
  Collapse,
  Descriptions,
  Table,
  Space,
  Spin,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import type { DueDiligenceResults } from '@/lib/openai/due-diligence'

const { Text, Paragraph } = Typography

interface DueDiligenceReport {
  id: string
  vendor_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results: DueDiligenceResults | null
  error_message: string | null
  model_used: string | null
  tokens_used: number | null
  search_queries_used: number | null
  created_at: string
  completed_at: string | null
}

interface ApplicationDueDiligenceTabProps {
  applicationId: string
}

export default function ApplicationDueDiligenceTab({ applicationId }: ApplicationDueDiligenceTabProps) {
  const [reports, setReports] = useState<DueDiligenceReport[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchReports = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/due-diligence`)
      if (response.ok) {
        const data = await response.json()
        setReports(data)
      }
    } catch {
      // silently fail on fetch
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleRunAnalysis = async () => {
    setRunning(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/due-diligence`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok || response.status === 502) {
        // 502 means analysis failed but we got the report row back
        setReports(prev => [data, ...prev])
      }
    } catch {
      // error handled by UI state
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  const latestReport = reports[0]
  const previousReports = reports.slice(1)

  // Running state
  if (running) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }}>
          Analyzing vendor... This may take 1-2 minutes as we search multiple platforms.
        </Paragraph>
        <Text type="secondary">
          Searching Google Reviews, Yelp, BBB, social media, and public records.
        </Text>
      </div>
    )
  }

  // Empty state
  if (!latestReport) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <SearchOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 16 }} />
        <Paragraph>
          No due diligence analysis has been run for this vendor yet.
        </Paragraph>
        <Button type="primary" icon={<SearchOutlined />} onClick={handleRunAnalysis}>
          Run Analysis
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<SearchOutlined />} onClick={handleRunAnalysis}>
          Run New Analysis
        </Button>
      </div>

      <ReportDisplay report={latestReport} />

      {previousReports.length > 0 && (
        <>
          <Divider />
          <Collapse
            ghost
            items={[{
              key: 'history',
              label: (
                <Space>
                  <HistoryOutlined />
                  <span>Previous Analyses ({previousReports.length})</span>
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {previousReports.map(report => (
                    <div key={report.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        {new Date(report.created_at).toLocaleString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </Text>
                      <ReportDisplay report={report} />
                    </div>
                  ))}
                </div>
              ),
            }]}
          />
        </>
      )}
    </div>
  )
}

// ============================================================================
// Report Display
// ============================================================================

function ReportDisplay({ report }: { report: DueDiligenceReport }) {
  if (report.status === 'failed') {
    return (
      <Alert
        type="error"
        showIcon
        message="Analysis Failed"
        description={report.error_message || 'An unknown error occurred during the analysis.'}
      />
    )
  }

  if (report.status === 'running' || report.status === 'pending') {
    return (
      <Alert
        type="info"
        showIcon
        icon={<ClockCircleOutlined />}
        message="Analysis In Progress"
        description="This analysis is still running. Refresh the page to check for updates."
      />
    )
  }

  if (!report.results) {
    return <Alert type="warning" title="No results available" />
  }

  const results = report.results

  const confidenceColor =
    results.confidence_level === 'high' ? 'success' :
    results.confidence_level === 'medium' ? 'warning' : 'error'

  const confidenceAlertType =
    results.confidence_level === 'high' ? 'success' as const :
    results.confidence_level === 'medium' ? 'warning' as const : 'error' as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <Alert
        type={confidenceAlertType}
        showIcon
        icon={results.confidence_level === 'high' ? <CheckCircleOutlined /> : <WarningOutlined />}
        title={
          <Space>
            <span>Due Diligence Summary</span>
            <Tag color={confidenceColor}>{results.confidence_level.toUpperCase()} Confidence</Tag>
          </Space>
        }
        description={results.summary}
      />

      {/* Risk Flags & Positive Signals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Risk Flags</Text>
          {results.risk_flags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {results.risk_flags.map((flag, i) => (
                <Tag key={i} color="red">{flag}</Tag>
              ))}
            </div>
          ) : (
            <Text type="secondary">None identified</Text>
          )}
        </div>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Positive Signals</Text>
          {results.positive_signals.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {results.positive_signals.map((signal, i) => (
                <Tag key={i} color="green">{signal}</Tag>
              ))}
            </div>
          ) : (
            <Text type="secondary">None identified</Text>
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      <Collapse
        defaultActiveKey={['reviews', 'presence']}
        items={[
          {
            key: 'reviews',
            label: 'Reviews & Ratings',
            children: <ReviewsSection reviews={results.reviews_ratings} />,
          },
          {
            key: 'presence',
            label: 'Online Presence',
            children: <OnlinePresenceSection presence={results.online_presence} />,
          },
          {
            key: 'community',
            label: 'Community Signals',
            children: <CommunitySection signals={results.community_signals} />,
          },
          {
            key: 'legal',
            label: 'Business & Legal',
            children: <BusinessLegalSection legal={results.business_legal} />,
          },
        ]}
      />

      {/* Sources */}
      {results.sources.length > 0 && (
        <>
          <Divider plain>Sources</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {results.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <LinkOutlined />
                <span>{source.title}</span>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Metadata */}
      <div style={{ display: 'flex', gap: 16, color: '#999', fontSize: 12, marginTop: 8 }}>
        {report.model_used && <span>Model: {report.model_used}</span>}
        {report.tokens_used && <span>Tokens: {report.tokens_used.toLocaleString()}</span>}
        {report.search_queries_used != null && <span>Web searches: {report.search_queries_used}</span>}
        {report.completed_at && (
          <span>
            Completed: {new Date(report.completed_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Section Components
// ============================================================================

function ReviewsSection({ reviews }: { reviews: DueDiligenceResults['reviews_ratings'] }) {
  const platforms = [
    { key: 'google', label: 'Google', data: reviews.google },
    { key: 'yelp', label: 'Yelp', data: reviews.yelp },
    { key: 'facebook', label: 'Facebook', data: reviews.facebook },
    { key: 'angi', label: 'Angi/HomeAdvisor', data: reviews.angi },
  ]

  const bbb = reviews.bbb

  const columns = [
    { title: 'Platform', dataIndex: 'label', key: 'label', width: 150 },
    {
      title: 'Rating',
      key: 'rating',
      width: 100,
      render: (_: unknown, record: { data: { rating?: number | null } | null }) =>
        record.data?.rating != null ? `${record.data.rating}/5` : '-',
    },
    {
      title: 'Reviews',
      key: 'count',
      width: 100,
      render: (_: unknown, record: { data: { review_count?: number | null } | null }) =>
        record.data?.review_count != null ? record.data.review_count.toLocaleString() : '-',
    },
    {
      title: 'Link',
      key: 'link',
      width: 80,
      render: (_: unknown, record: { data: { url?: string | null } | null }) =>
        record.data?.url ? (
          <a href={record.data.url} target="_blank" rel="noopener noreferrer"><LinkOutlined /></a>
        ) : '-',
    },
    {
      title: 'Summary',
      key: 'summary',
      render: (_: unknown, record: { data: { summary?: string | null } | null }) =>
        record.data?.summary || '-',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Table
        dataSource={platforms}
        columns={columns}
        rowKey="key"
        pagination={false}
        size="small"
      />
      {bbb && (
        <Descriptions bordered size="small" column={2} title="Better Business Bureau">
          <Descriptions.Item label="BBB Rating">{bbb.rating || '-'}</Descriptions.Item>
          <Descriptions.Item label="Accredited">
            {bbb.accredited == null ? '-' : bbb.accredited ? 'Yes' : 'No'}
          </Descriptions.Item>
          <Descriptions.Item label="Link" span={2}>
            {bbb.url ? (
              <a href={bbb.url} target="_blank" rel="noopener noreferrer">{bbb.url}</a>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Summary" span={2}>{bbb.summary || '-'}</Descriptions.Item>
        </Descriptions>
      )}
      {reviews.other.length > 0 && (
        <Table
          dataSource={reviews.other}
          columns={[
            { title: 'Platform', dataIndex: 'platform', key: 'platform', width: 150 },
            {
              title: 'Rating',
              dataIndex: 'rating',
              key: 'rating',
              width: 100,
              render: (rating: number | null) =>
                rating != null ? `${rating}/5` : '-',
            },
            {
              title: 'Link',
              dataIndex: 'url',
              key: 'url',
              width: 80,
              render: (url: string | null) =>
                url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"><LinkOutlined /></a>
                ) : '-',
            },
            {
              title: 'Summary',
              dataIndex: 'summary',
              key: 'summary',
              render: (text: string | null) => text || '-',
            },
          ]}
          rowKey="platform"
          pagination={false}
          size="small"
          title={() => 'Other Platforms'}
        />
      )}
    </div>
  )
}

function OnlinePresenceSection({ presence }: { presence: DueDiligenceResults['online_presence'] }) {
  const entries = [
    { key: 'website', label: 'Website', data: presence.website },
    { key: 'facebook', label: 'Facebook', data: presence.facebook },
    { key: 'instagram', label: 'Instagram', data: presence.instagram },
    { key: 'linkedin', label: 'LinkedIn', data: presence.linkedin },
    { key: 'portfolio', label: 'Portfolio', data: presence.portfolio },
  ]

  const columns = [
    { title: 'Platform', dataIndex: 'label', key: 'label', width: 120 },
    {
      title: 'Found',
      key: 'exists',
      width: 80,
      render: (_: unknown, record: { data: { exists?: boolean | null } | null }) =>
        record.data?.exists == null ? '-' :
          record.data.exists ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: 'URL',
      key: 'url',
      width: 200,
      render: (_: unknown, record: { data: { url?: string | null } | null }) =>
        record.data?.url ? (
          <a href={record.data.url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
            {record.data.url}
          </a>
        ) : '-',
    },
    {
      title: 'Followers',
      key: 'followers',
      width: 100,
      render: (_: unknown, record: { data: { followers?: number | null } | null }) =>
        record.data?.followers != null ? record.data.followers.toLocaleString() : '-',
    },
    {
      title: 'Notes',
      key: 'notes',
      render: (_: unknown, record: { data: { notes?: string | null } | null }) =>
        record.data?.notes || '-',
    },
  ]

  return (
    <Table
      dataSource={entries}
      columns={columns}
      rowKey="key"
      pagination={false}
      size="small"
    />
  )
}

function CommunitySection({ signals }: { signals: DueDiligenceResults['community_signals'] }) {
  return (
    <Descriptions bordered size="small" column={1}>
      <Descriptions.Item label="Reddit Mentions">
        {signals.reddit_mentions || 'No mentions found'}
      </Descriptions.Item>
      <Descriptions.Item label="Facebook Group Mentions">
        {signals.facebook_group_mentions || 'No mentions found'}
      </Descriptions.Item>
      <Descriptions.Item label="Local Forum Mentions">
        {signals.local_forum_mentions || 'No mentions found'}
      </Descriptions.Item>
      <Descriptions.Item label="Overall Sentiment">
        {signals.overall_sentiment || 'Insufficient data'}
      </Descriptions.Item>
    </Descriptions>
  )
}

function BusinessLegalSection({ legal }: { legal: DueDiligenceResults['business_legal'] }) {
  return (
    <Descriptions bordered size="small" column={1}>
      <Descriptions.Item label="BBB Complaints">
        {legal.bbb_complaints || 'None found'}
      </Descriptions.Item>
      <Descriptions.Item label="Lawsuits / Liens">
        {legal.lawsuits_liens || 'None found'}
      </Descriptions.Item>
      <Descriptions.Item label="Code Violations">
        {legal.code_violations || 'None found'}
      </Descriptions.Item>
      <Descriptions.Item label="Licensing Status">
        {legal.licensing_status || 'Unable to verify'}
      </Descriptions.Item>
      <Descriptions.Item label="Estimated Years in Business">
        {legal.years_in_business_estimate || 'Unknown'}
      </Descriptions.Item>
    </Descriptions>
  )
}
