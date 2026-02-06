'use client';

import { Card, Checkbox, Space, Typography, Tag, Collapse, Badge, Tooltip } from 'antd';
import {
  TrophyOutlined,
  EnvironmentOutlined,
  StarFilled,
} from '@ant-design/icons';
import type { VendorWithMatchScore } from '@/lib/matching';
import { SERVICE_TYPE_LABELS } from '@/types/database';
import MatchScoreBadge from './MatchScoreBadge';
import MatchFactorsList from './MatchFactorsList';
import ConfidenceIndicator from './ConfidenceIndicator';

const { Text, Title } = Typography;

interface VendorSuggestionCardProps {
  vendor: VendorWithMatchScore;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  showDetails?: boolean;
  rank?: number;
}

/**
 * Vendor Suggestion Card Component
 *
 * Displays a vendor as a suggested match with their score and details.
 */
export default function VendorSuggestionCard({
  vendor,
  selected,
  onSelect,
  showDetails = false,
  rank,
}: VendorSuggestionCardProps) {
  const { matchScore } = vendor;

  // Get key positive factors (high scores)
  const positiveFactors = matchScore.factors
    .filter(f => f.score >= 70)
    .slice(0, 3);

  return (
    <Card
      size="small"
      style={{
        marginBottom: 12,
        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        backgroundColor: selected ? '#e6f7ff' : undefined,
      }}
      styles={{
        body: { padding: 12 },
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 4 }}>
          <Checkbox
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
        </div>

        {/* Score Badge */}
        <div style={{ flexShrink: 0 }}>
          <MatchScoreBadge
            score={matchScore.totalScore}
            confidence={matchScore.confidence}
            size="default"
            showLabel={false}
          />
        </div>

        {/* Vendor Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {rank && rank <= 3 && (
              <Tooltip title={`#${rank} recommended`}>
                <Badge
                  count={<TrophyOutlined style={{ color: '#faad14', fontSize: 14 }} />}
                />
              </Tooltip>
            )}
            <Title level={5} style={{ margin: 0, fontSize: 15 }}>
              {vendor.business_name}
            </Title>
          </div>

          <Text type="secondary" style={{ fontSize: 13 }}>
            {vendor.contact_name}
          </Text>

          {/* Services */}
          <div style={{ marginTop: 8 }}>
            <Space wrap size="small">
              {vendor.services.slice(0, 3).map((service) => (
                <Tag key={service} color="blue" style={{ fontSize: 11 }}>
                  {SERVICE_TYPE_LABELS[service] || service}
                </Tag>
              ))}
              {vendor.services.length > 3 && (
                <Tag style={{ fontSize: 11 }}>+{vendor.services.length - 3}</Tag>
              )}
            </Space>
          </div>

          {/* Key factors as compact tags */}
          <div style={{ marginTop: 8 }}>
            <Space wrap size="small">
              {positiveFactors.map((factor, index) => (
                <Tag
                  key={index}
                  color="success"
                  style={{ fontSize: 11 }}
                >
                  {factor.reason}
                </Tag>
              ))}
            </Space>
          </div>

          {/* Warnings */}
          {matchScore.warnings.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {matchScore.warnings.slice(0, 2).map((warning, index) => (
                <Tag
                  key={index}
                  color={warning.severity === 'high' ? 'error' : 'warning'}
                  style={{ fontSize: 11 }}
                >
                  {warning.message}
                </Tag>
              ))}
            </div>
          )}

          {/* Expandable details */}
          {showDetails && (
            <Collapse
              ghost
              size="small"
              style={{ marginTop: 8 }}
              items={[
                {
                  key: '1',
                  label: <Text type="secondary" style={{ fontSize: 12 }}>View score breakdown</Text>,
                  children: (
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <ConfidenceIndicator confidence={matchScore.confidence} />
                      </div>
                      <MatchFactorsList
                        factors={matchScore.factors}
                        warnings={matchScore.warnings}
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>

        {/* Right side: Quick info */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {vendor.total_reviews > 0 && (
            <div style={{ marginBottom: 4 }}>
              <StarFilled style={{ color: '#faad14', marginRight: 4 }} />
              <Text style={{ fontSize: 13 }}>
                {vendor.performance_score.toFixed(0)}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {' '}({vendor.total_reviews})
              </Text>
            </div>
          )}
          {vendor.service_areas && vendor.service_areas.length > 0 && (
            <Tooltip title={vendor.service_areas.slice(0, 5).join(', ')}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <EnvironmentOutlined /> {vendor.service_areas.length} areas
              </Text>
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
}
