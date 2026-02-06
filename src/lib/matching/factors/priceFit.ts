/**
 * Price Fit Factor
 *
 * Calculates how well vendor pricing matches request budget.
 */

import type { MatchFactor, PriceFitInput } from '../types';
import {
  PRICE_FIT_CONFIG,
  BUDGET_RANGE_VALUES,
  JOB_SIZE_VALUES,
  MATCH_SCORING_WEIGHTS,
} from '../config';

/**
 * Check if two ranges overlap
 */
function rangesOverlap(
  range1: { min: number; max: number },
  range2: { min: number; max: number }
): 'full' | 'partial' | 'none' {
  // Full overlap: one range contains the other or they're identical
  if (
    (range1.min >= range2.min && range1.max <= range2.max) ||
    (range2.min >= range1.min && range2.max <= range1.max)
  ) {
    return 'full';
  }

  // Partial overlap
  if (range1.min <= range2.max && range2.min <= range1.max) {
    return 'partial';
  }

  return 'none';
}

/**
 * Get the combined range from vendor's job size preferences
 */
function getVendorPriceRange(jobSizeRanges: string[]): { min: number; max: number } | null {
  if (!jobSizeRanges || jobSizeRanges.length === 0) {
    return null;
  }

  let minPrice = Infinity;
  let maxPrice = 0;

  for (const range of jobSizeRanges) {
    const values = JOB_SIZE_VALUES[range];
    if (values) {
      minPrice = Math.min(minPrice, values.min);
      maxPrice = Math.max(maxPrice, values.max);
    }
  }

  if (minPrice === Infinity) return null;

  return { min: minPrice, max: maxPrice };
}

/**
 * Calculate the price fit factor score
 */
export function calculatePriceFit(input: PriceFitInput): MatchFactor {
  const { vendorJobSizeRange, requestBudgetRange } = input;
  const weight = MATCH_SCORING_WEIGHTS.priceFit;

  // No budget specified in request - neutral
  if (!requestBudgetRange || requestBudgetRange === 'not_sure') {
    return {
      name: 'Price Fit',
      score: PRICE_FIT_CONFIG.noDataScore,
      weight,
      weighted: PRICE_FIT_CONFIG.noDataScore * weight,
      reason: 'Budget not specified',
      icon: 'info',
    };
  }

  // Get vendor's price range
  const vendorRange = getVendorPriceRange(vendorJobSizeRange || []);

  // Vendor hasn't specified job sizes - neutral
  if (!vendorRange) {
    return {
      name: 'Price Fit',
      score: PRICE_FIT_CONFIG.noDataScore,
      weight,
      weighted: PRICE_FIT_CONFIG.noDataScore * weight,
      reason: 'Vendor pricing unknown',
      icon: 'info',
    };
  }

  // Get request budget range
  const budgetRange = BUDGET_RANGE_VALUES[requestBudgetRange];
  if (!budgetRange) {
    return {
      name: 'Price Fit',
      score: PRICE_FIT_CONFIG.noDataScore,
      weight,
      weighted: PRICE_FIT_CONFIG.noDataScore * weight,
      reason: 'Invalid budget range',
      icon: 'info',
    };
  }

  // Check overlap
  const overlap = rangesOverlap(budgetRange, vendorRange);

  switch (overlap) {
    case 'full':
      return {
        name: 'Price Fit',
        score: PRICE_FIT_CONFIG.goodFitScore,
        weight,
        weighted: PRICE_FIT_CONFIG.goodFitScore * weight,
        reason: 'Budget matches vendor range',
        icon: 'check',
      };

    case 'partial':
      return {
        name: 'Price Fit',
        score: PRICE_FIT_CONFIG.partialFitScore,
        weight,
        weighted: PRICE_FIT_CONFIG.partialFitScore * weight,
        reason: 'Budget partially matches',
        icon: 'info',
      };

    default:
      return {
        name: 'Price Fit',
        score: PRICE_FIT_CONFIG.poorFitScore,
        weight,
        weighted: PRICE_FIT_CONFIG.poorFitScore * weight,
        reason: 'Budget may not match vendor range',
        icon: 'warning',
      };
  }
}
