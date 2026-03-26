'use client'

import { Card, Tag, Space, Descriptions, Rate, Typography, Spin } from 'antd'
import { VendorWithMatches } from '@/types/database'
import { REQUEST_STATUS_LABELS, RequestStatus, URGENCY_LABELS, UrgencyLevel } from '@/types/database'
import { useServiceTaxonomy } from '@/hooks/useServiceTaxonomy'
import { matchStatusColors, matchStatusLabels } from './constants'

const { Text } = Typography

interface VendorHistoryTabProps {
  vendor: VendorWithMatches
  loading: boolean
}

export default function VendorHistoryTab({ vendor, loading }: VendorHistoryTabProps) {
  const { labels: SERVICE_TYPE_LABELS } = useServiceTaxonomy()

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <Spin />
      </div>
    )
  }

  if (!vendor.matches || vendor.matches.length === 0) {
    return <Text type="secondary">No referrals yet</Text>
  }

  return (
    <div style={{ maxHeight: 600, overflowY: 'auto' }}>
      {vendor.matches
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((match) => (
          <Card
            key={match.id}
            size="small"
            style={{ marginBottom: 8 }}
            title={
              <Space>
                <Tag color="blue">
                  {SERVICE_TYPE_LABELS[match.request?.service_type] || match.request?.service_type}
                </Tag>
                <Tag color={matchStatusColors[match.status]}>
                  {matchStatusLabels[match.status]}
                </Tag>
              </Space>
            }
            extra={
              match.review_rating && (
                <Rate disabled defaultValue={match.review_rating} style={{ fontSize: 12 }} />
              )
            }
          >
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="Location">
                {match.request?.property_address || match.request?.property_location || '-'}
                {match.request?.zip_code && ` (${match.request.zip_code})`}
              </Descriptions.Item>
              <Descriptions.Item label="Landlord">
                {match.request?.first_name || match.request?.landlord_name || match.request?.landlord_email || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {new Date(match.created_at).toLocaleDateString()}
              </Descriptions.Item>
              {match.request?.urgency && (
                <Descriptions.Item label="Urgency">
                  <Tag color={match.request.urgency === 'emergency' ? 'red' : match.request.urgency === 'high' ? 'orange' : 'default'}>
                    {URGENCY_LABELS[match.request.urgency as UrgencyLevel]}
                  </Tag>
                </Descriptions.Item>
              )}
              {match.request?.status && (
                <Descriptions.Item label="Request Status">
                  <Tag>{REQUEST_STATUS_LABELS[match.request.status as RequestStatus]}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
            {match.request?.job_description && (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {match.request.job_description.length > 100
                  ? `${match.request.job_description.substring(0, 100)}...`
                  : match.request.job_description}
              </Text>
            )}
          </Card>
        ))}
    </div>
  )
}
