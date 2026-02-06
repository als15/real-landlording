'use client';

import { Progress, Tooltip } from 'antd';
import type { MatchConfidence } from '@/lib/matching';

interface MatchScoreBadgeProps {
  score: number;
  confidence: MatchConfidence;
  size?: 'small' | 'default' | 'large';
  showLabel?: boolean;
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
 */
export default function MatchScoreBadge({
  score,
  confidence,
  size = 'default',
  showLabel = true,
}: MatchScoreBadgeProps) {
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
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <div style={{ textAlign: 'center' }}>
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
    </Tooltip>
  );
}
