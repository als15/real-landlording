'use client';

import { useState } from 'react';
import { Progress, Tooltip, Popover, Typography, Divider } from 'antd';
import type { MatchConfidence, MatchScoreResult } from '@/lib/matching';
import ConfidenceIndicator from './ConfidenceIndicator';
import MatchFactorsList from './MatchFactorsList';

const { Text } = Typography;

interface MatchScoreBadgeProps {
  score: number;
  confidence: MatchConfidence;
  size?: 'small' | 'default' | 'large';
  showLabel?: boolean;
  /** Full match score data — enables click-to-expand popover with score breakdown */
  matchScore?: MatchScoreResult;
}

/**
 * Get color based on score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#52c41a'; // Green
  if (score >= 65) return '#73d13d'; // Light green
  if (score >= 50) return '#faad14'; // Orange
  if (score >= 35) return '#ff7a45'; // Orange-red
  return '#ff4d4f'; // Red
}

/**
 * Get label based on score
 */
function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Low';
  return 'Poor';
}

/**
 * Match Score Badge Component
 *
 * Displays a circular progress indicator showing the match score.
 * When matchScore is provided, clicking opens a popover with full score breakdown.
 */
export default function MatchScoreBadge({
  score,
  confidence,
  size = 'default',
  showLabel = true,
  matchScore,
}: MatchScoreBadgeProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const sizeConfig = {
    small: { width: 50, fontSize: 12 },
    default: { width: 70, fontSize: 14 },
    large: { width: 90, fontSize: 16 },
  };

  const { width, fontSize } = sizeConfig[size];

  const tooltipContent = (
    <div>
      <div><strong>Match Score:</strong> {score}/100</div>
      <div><strong>Quality:</strong> {label}</div>
      <div><strong>Confidence:</strong> {confidence}</div>
      {matchScore && <div style={{ marginTop: 4, fontSize: 11 }}>Click for details</div>}
    </div>
  );

  const badge = (
    <div style={{ textAlign: 'center', cursor: matchScore ? 'pointer' : 'default' }}>
      <Progress
        type="circle"
        percent={score}
        size={width}
        strokeColor={color}
        format={() => (
          <span style={{ fontSize, fontWeight: 600, color }}>
            {score}
          </span>
        )}
      />
      {showLabel && (
        <div
          style={{
            fontSize: size === 'small' ? 10 : 12,
            color,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );

  // If full matchScore data is provided, wrap in a Popover for click-to-expand
  if (matchScore) {
    const popoverContent = (
      <div style={{ maxWidth: 360, maxHeight: 450, overflowY: 'auto' }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14 }}>Match Score: {score}/100</Text>
        </div>
        <ConfidenceIndicator confidence={confidence} />
        <Divider style={{ margin: '8px 0' }} />
        <MatchFactorsList
          factors={matchScore.factors}
          warnings={matchScore.warnings}
          compact={false}
        />
      </div>
    );

    return (
      <Popover
        content={popoverContent}
        title="Score Breakdown"
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="right"
      >
        <Tooltip title={tooltipContent} open={popoverOpen ? false : undefined}>
          {badge}
        </Tooltip>
      </Popover>
    );
  }

  return (
    <Tooltip title={tooltipContent}>
      {badge}
    </Tooltip>
  );
}
