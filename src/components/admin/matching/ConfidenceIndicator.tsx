'use client';

import { Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { MatchConfidence } from '@/lib/matching';

interface ConfidenceIndicatorProps {
  confidence: MatchConfidence;
  showTooltip?: boolean;
}

const confidenceConfig: Record<
  MatchConfidence,
  { color: string; icon: React.ReactNode; label: string; description: string }
> = {
  high: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    label: 'High Confidence',
    description: 'Strong data available for this match score',
  },
  medium: {
    color: 'warning',
    icon: <InfoCircleOutlined />,
    label: 'Medium Confidence',
    description: 'Some data points may be missing',
  },
  low: {
    color: 'default',
    icon: <QuestionCircleOutlined />,
    label: 'Low Confidence',
    description: 'Limited data available - score may not be accurate',
  },
};

/**
 * Confidence Indicator Component
 *
 * Shows the confidence level of a match score.
 */
export default function ConfidenceIndicator({
  confidence,
  showTooltip = true,
}: ConfidenceIndicatorProps) {
  const config = confidenceConfig[confidence];

  const tag = (
    <Tag icon={config.icon} color={config.color}>
      {config.label}
    </Tag>
  );

  if (showTooltip) {
    return <Tooltip title={config.description}>{tag}</Tooltip>;
  }

  return tag;
}
