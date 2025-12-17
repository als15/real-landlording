/**
 * Vendor Vetting Score Calculator
 *
 * Calculates the initial vetting score for vendors based on
 * objective factors (licensed, insured, years in business) plus
 * an optional admin adjustment (±10 points).
 */

import { VETTING_CONFIG } from './config';

export interface VettingInput {
  licensed: boolean;
  insured: boolean;
  years_in_business: number | null;
  vetting_admin_adjustment?: number;
}

export interface VettingScoreBreakdown {
  licensedPoints: number;
  insuredPoints: number;
  yearsPoints: number;
  adminAdjustment: number;
  totalScore: number;
}

/**
 * Calculate vetting score from vendor attributes
 *
 * Point distribution:
 * - Licensed: 15 points
 * - Insured: 10 points
 * - Years in business: 0-10 points (2 points per year, max 10)
 * - Admin adjustment: ±10 points
 *
 * Total possible: 0-45 points
 */
export function calculateVettingScore(input: VettingInput): VettingScoreBreakdown {
  // Licensed points
  const licensedPoints = input.licensed ? VETTING_CONFIG.licensedPoints : 0;

  // Insured points
  const insuredPoints = input.insured ? VETTING_CONFIG.insuredPoints : 0;

  // Years in business points (scaled: 2 points per year up to 5 years = 10 max)
  let yearsPoints = 0;
  if (input.years_in_business !== null && input.years_in_business > 0) {
    const yearsRatio = Math.min(
      input.years_in_business / VETTING_CONFIG.yearsForMaxPoints,
      1
    );
    yearsPoints = Math.round(yearsRatio * VETTING_CONFIG.yearsInBusinessMax);
  }

  // Admin adjustment (clamped to ±10)
  const adminAdjustment = Math.max(
    -VETTING_CONFIG.adminAdjustmentRange,
    Math.min(
      VETTING_CONFIG.adminAdjustmentRange,
      input.vetting_admin_adjustment || 0
    )
  );

  // Calculate total (clamped to 0-45)
  const rawTotal = licensedPoints + insuredPoints + yearsPoints + adminAdjustment;
  const totalScore = Math.max(0, Math.min(VETTING_CONFIG.maxTotalVettingScore, rawTotal));

  return {
    licensedPoints,
    insuredPoints,
    yearsPoints,
    adminAdjustment,
    totalScore,
  };
}

/**
 * Get a display-friendly breakdown of vetting score
 */
export function getVettingScoreDisplay(breakdown: VettingScoreBreakdown): string {
  const parts: string[] = [];

  if (breakdown.licensedPoints > 0) {
    parts.push(`Licensed: +${breakdown.licensedPoints}`);
  }
  if (breakdown.insuredPoints > 0) {
    parts.push(`Insured: +${breakdown.insuredPoints}`);
  }
  if (breakdown.yearsPoints > 0) {
    parts.push(`Experience: +${breakdown.yearsPoints}`);
  }
  if (breakdown.adminAdjustment !== 0) {
    const sign = breakdown.adminAdjustment > 0 ? '+' : '';
    parts.push(`Admin: ${sign}${breakdown.adminAdjustment}`);
  }

  return parts.join(', ') || 'No factors';
}

/**
 * Determine vetting tier based on score
 */
export type VettingTier = 'strong' | 'good' | 'acceptable' | 'conditional' | 'declined';

export function getVettingTier(score: number): { tier: VettingTier; label: string; color: string } {
  if (score >= 35) {
    return { tier: 'strong', label: 'Strong Vendor', color: '#52c41a' };
  }
  if (score >= 30) {
    return { tier: 'good', label: 'Good Vendor', color: '#73d13d' };
  }
  if (score >= 25) {
    return { tier: 'acceptable', label: 'Acceptable', color: '#faad14' };
  }
  if (score >= 15) {
    return { tier: 'conditional', label: 'Conditional', color: '#ff7a45' };
  }
  return { tier: 'declined', label: 'Below Threshold', color: '#ff4d4f' };
}
