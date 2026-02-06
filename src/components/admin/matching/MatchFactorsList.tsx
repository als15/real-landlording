'use client';

import { List, Progress, Tag, Space, Typography, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { MatchFactor, MatchWarning } from '@/lib/matching';

const { Text } = Typography;

interface MatchFactorsListProps {
  factors: MatchFactor[];
  warnings?: MatchWarning[];
  compact?: boolean;
}

/**
 * Get icon component based on factor icon type
 */
function getFactorIcon(icon?: MatchFactor['icon']) {
  switch (icon) {
    case 'check':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'star':
      return <StarOutlined style={{ color: '#faad14' }} />;
    case 'info':
    default:
      return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
  }
}

/**
 * Get color for progress bar based on score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#73d13d';
  if (score >= 40) return '#faad14';
  if (score >= 20) return '#ff7a45';
  return '#ff4d4f';
}

/**
 * Match Factors List Component
 *
 * Displays a detailed breakdown of all scoring factors.
 */
export default function MatchFactorsList({
  factors,
  warnings = [],
  compact = false,
}: MatchFactorsListProps) {
  if (compact) {
    // Compact view: just show icons and key factors
    const topFactors = factors
      .filter(f => f.score >= 70 || f.score <= 30)
      .slice(0, 4);

    return (
      <Space wrap size="small">
        {topFactors.map((factor, index) => (
          <Tooltip key={index} title={`${factor.name}: ${factor.reason}`}>
            <Tag
              icon={getFactorIcon(factor.icon)}
              color={factor.score >= 70 ? 'success' : factor.score <= 30 ? 'error' : 'default'}
            >
              {factor.name}
            </Tag>
          </Tooltip>
        ))}
        {factors.length > topFactors.length && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            +{factors.length - topFactors.length} more
          </Text>
        )}
      </Space>
    );
  }

  // Full view: show all factors with progress bars
  return (
    <div>
      {/* Warnings section */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {warnings.map((warning, index) => (
            <Tag
              key={index}
              color={warning.severity === 'high' ? 'error' : 'warning'}
              icon={<WarningOutlined />}
              style={{ marginBottom: 4 }}
            >
              {warning.message}
            </Tag>
          ))}
        </div>
      )}

      {/* Factors list */}
      <List
        size="small"
        dataSource={factors}
        renderItem={(factor) => (
          <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Space size="small">
                  {getFactorIcon(factor.icon)}
                  <Text strong style={{ fontSize: 13 }}>{factor.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    ({Math.round(factor.weight * 100)}%)
                  </Text>
                </Space>
                <Text style={{ fontSize: 13, fontWeight: 500 }}>
                  {factor.score.toFixed(0)}/100
                </Text>
              </div>
              <Progress
                percent={factor.score}
                size="small"
                strokeColor={getScoreColor(factor.score)}
                showInfo={false}
                style={{ marginBottom: 4 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {factor.reason}
              </Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
