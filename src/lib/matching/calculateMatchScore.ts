/**
 * Match Score Calculator
 *
 * Main function that calculates the match score for a vendor-request pair
 * by combining all individual factors.
 */

import type {
  MatchScoreResult,
  MatchFactor,
  MatchWarning,
  MatchConfidence,
  MatchingContext,
  VendorMatchData,
  VendorWithMatchScore,
} from './types';
import { MATCH_SCORING_THRESHOLDS, SCORING_VERSION } from './config';
import {
  calculateServiceMatch,
  calculateLocationMatch,
  calculatePerformanceScore,
  calculateResponseTime,
  calculateAvailability,
  calculateSpecialtyMatch,
  calculateCapacity,
  calculatePriceFit,
} from './factors';
import type { Vendor, ServiceRequest } from '@/types/database';

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Determine confidence level based on score and available data
 */
function determineConfidence(
  totalScore: number,
  factors: MatchFactor[]
): MatchConfidence {
  // Count how many factors have actual data (not just neutral scores)
  const factorsWithData = factors.filter(
    f => f.icon !== 'info' || f.score !== 50
  ).length;

  const dataRatio = factorsWithData / factors.length;

  // High confidence: good score and most factors have data
  if (
    totalScore >= MATCH_SCORING_THRESHOLDS.highConfidenceThreshold &&
    dataRatio >= 0.6
  ) {
    return 'high';
  }

  // Medium confidence
  if (
    totalScore >= MATCH_SCORING_THRESHOLDS.mediumConfidenceThreshold &&
    dataRatio >= 0.4
  ) {
    return 'medium';
  }

  return 'low';
}

/**
 * Check if current day is a weekend
 */
function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Create matching context from a service request
 */
export function createMatchingContext(request: ServiceRequest): MatchingContext {
  return {
    request,
    zipCode: request.zip_code || null,
    serviceType: request.service_type,
    urgency: request.urgency,
    budgetRange: request.budget_range || null,
    serviceDetails: request.service_details || null,
    isEmergency: request.urgency === 'emergency',
  };
}

// ===========================================
// MAIN CALCULATION
// ===========================================

/**
 * Calculate match score for a single vendor against a request
 */
export function calculateMatchScore(
  vendor: VendorMatchData,
  context: MatchingContext
): MatchScoreResult {
  const factors: MatchFactor[] = [];
  const warnings: MatchWarning[] = [];

  // 1. Service Match (25%)
  const serviceFactor = calculateServiceMatch({
    vendorServices: vendor.services,
    requestedService: context.serviceType,
  });
  factors.push(serviceFactor);

  // 2. Location Match (20%)
  const locationFactor = calculateLocationMatch({
    vendorServiceAreas: vendor.service_areas,
    requestZipCode: context.zipCode,
    requestLocation: context.request.property_location,
  });
  factors.push(locationFactor);

  // 3. Performance Score (15%)
  const performanceFactor = calculatePerformanceScore({
    performanceScore: vendor.performance_score,
    totalReviews: vendor.total_reviews,
  });
  factors.push(performanceFactor);

  // 4. Response Time (10%)
  const responseTimeFactor = calculateResponseTime({
    avgResponseTimeHours: vendor.avgResponseTimeHours,
  });
  factors.push(responseTimeFactor);

  // 5. Availability/Urgency (10%)
  const availabilityResult = calculateAvailability({
    vendorEmergencyServices: vendor.emergency_services,
    vendorServiceHours: {
      weekdays: vendor.service_hours_weekdays,
      weekends: vendor.service_hours_weekends,
      is24_7: vendor.service_hours_24_7,
    },
    requestUrgency: context.urgency,
    isWeekend: isWeekend(),
  });
  factors.push(availabilityResult.factor);
  if (availabilityResult.warning) {
    warnings.push(availabilityResult.warning);
  }

  // 6. Specialty Match (10%)
  const specialtyFactor = calculateSpecialtyMatch({
    vendorSpecialties: vendor.service_specialties,
    requestedService: context.serviceType,
    requestServiceDetails: context.serviceDetails,
  });
  factors.push(specialtyFactor);

  // 7. Capacity (5%)
  const capacityFactor = calculateCapacity({
    pendingJobsCount: vendor.pendingJobsCount,
  });
  factors.push(capacityFactor);

  // 8. Price Fit (5%)
  const priceFitFactor = calculatePriceFit({
    vendorJobSizeRange: vendor.job_size_range,
    requestBudgetRange: context.budgetRange,
  });
  factors.push(priceFitFactor);

  // Calculate total score
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.weighted, 0)
  );

  // Determine confidence
  const confidence = determineConfidence(totalScore, factors);

  // Determine if recommended
  const recommended = totalScore >= MATCH_SCORING_THRESHOLDS.recommendedThreshold;

  // Add warnings for low-scoring critical factors
  if (serviceFactor.score === 0) {
    warnings.push({
      severity: 'high',
      message: 'Vendor does not offer this service type',
      factor: 'Service Match',
    });
  }

  if (locationFactor.score === 0) {
    warnings.push({
      severity: 'medium',
      message: 'Vendor may not serve this location',
      factor: 'Location',
    });
  }

  if (performanceFactor.score < 30) {
    warnings.push({
      severity: 'medium',
      message: 'Vendor has low performance rating',
      factor: 'Performance',
    });
  }

  return {
    vendorId: vendor.id,
    totalScore,
    confidence,
    factors,
    warnings,
    recommended,
  };
}

/**
 * Calculate match scores for multiple vendors
 */
export function calculateMatchScores(
  vendors: VendorMatchData[],
  context: MatchingContext
): VendorWithMatchScore[] {
  // Calculate scores for all vendors
  const scoredVendors = vendors.map(vendor => ({
    ...vendor,
    matchScore: calculateMatchScore(vendor, context),
  }));

  // Sort by score (descending)
  scoredVendors.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);

  // Assign ranks
  scoredVendors.forEach((vendor, index) => {
    vendor.matchScore.rank = index + 1;
  });

  // Limit recommendations to maxRecommendations
  let recommendedCount = 0;
  for (const vendor of scoredVendors) {
    if (vendor.matchScore.recommended) {
      recommendedCount++;
      if (recommendedCount > MATCH_SCORING_THRESHOLDS.maxRecommendations) {
        vendor.matchScore.recommended = false;
      }
    }
  }

  return scoredVendors;
}

/**
 * Enrich vendor with match data (pending jobs, response time, etc.)
 * This should be called before scoring when data is available
 */
export function enrichVendorWithMatchData(
  vendor: Vendor,
  matchData?: {
    pendingJobsCount?: number;
    avgResponseTimeHours?: number | null;
    acceptanceRate?: number | null;
    completionRate?: number | null;
  }
): VendorMatchData {
  return {
    ...vendor,
    pendingJobsCount: matchData?.pendingJobsCount ?? 0,
    avgResponseTimeHours: matchData?.avgResponseTimeHours ?? null,
    acceptanceRate: matchData?.acceptanceRate ?? null,
    completionRate: matchData?.completionRate ?? null,
  };
}

/**
 * Get scoring metadata
 */
export function getScoringMeta(scoredVendors: VendorWithMatchScore[]) {
  const totalEligible = scoredVendors.length;
  const totalRecommended = scoredVendors.filter(v => v.matchScore.recommended).length;
  const averageScore = totalEligible > 0
    ? Math.round(
        scoredVendors.reduce((sum, v) => sum + v.matchScore.totalScore, 0) / totalEligible
      )
    : 0;

  return {
    totalEligible,
    totalRecommended,
    averageScore,
    scoringVersion: SCORING_VERSION,
  };
}
