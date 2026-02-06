/**
 * Smart Matching Types
 *
 * Type definitions for the vendor-request matching system.
 */

import type { ServiceCategory, UrgencyLevel, BudgetRange, Vendor, ServiceRequest } from '@/types/database';

// ===========================================
// MATCH FACTOR TYPES
// ===========================================

/**
 * Individual scoring factor result
 */
export interface MatchFactor {
  /** Factor identifier */
  name: string;
  /** Raw score (0-100) */
  score: number;
  /** Weight applied to this factor (0-1) */
  weight: number;
  /** Weighted contribution to total (score * weight) */
  weighted: number;
  /** Human-readable explanation */
  reason: string;
  /** Icon hint for UI (optional) */
  icon?: 'check' | 'warning' | 'info' | 'star';
}

/**
 * Warning about a potential issue with a match
 */
export interface MatchWarning {
  /** Warning severity */
  severity: 'low' | 'medium' | 'high';
  /** Warning message */
  message: string;
  /** Factor that triggered the warning */
  factor: string;
}

/**
 * Confidence level in the match score
 */
export type MatchConfidence = 'high' | 'medium' | 'low';

// ===========================================
// MATCH SCORE RESULT
// ===========================================

/**
 * Complete match score result for a vendor-request pair
 */
export interface MatchScoreResult {
  /** Vendor ID */
  vendorId: string;
  /** Total match score (0-100) */
  totalScore: number;
  /** Confidence in the score based on available data */
  confidence: MatchConfidence;
  /** Individual factor breakdowns */
  factors: MatchFactor[];
  /** Warnings about potential issues */
  warnings: MatchWarning[];
  /** Whether this vendor is recommended (score > threshold) */
  recommended: boolean;
  /** Rank among all scored vendors (1 = best) */
  rank?: number;
}

/**
 * Vendor with match score attached
 */
export interface VendorWithMatchScore extends Vendor {
  matchScore: MatchScoreResult;
}

// ===========================================
// MATCH SCORING CONFIG
// ===========================================

/**
 * Configuration for match scoring weights
 */
export interface MatchScoringWeights {
  /** Weight for service type match (0-1) */
  serviceMatch: number;
  /** Weight for location/area match (0-1) */
  locationMatch: number;
  /** Weight for vendor performance score (0-1) */
  performanceScore: number;
  /** Weight for response time history (0-1) */
  responseTime: number;
  /** Weight for urgency/availability match (0-1) */
  availability: number;
  /** Weight for specialty/equipment match (0-1) */
  specialtyMatch: number;
  /** Weight for current capacity (0-1) */
  capacity: number;
  /** Weight for budget/price fit (0-1) */
  priceFit: number;
}

/**
 * Thresholds for match scoring
 */
export interface MatchScoringThresholds {
  /** Minimum score to be considered recommended */
  recommendedThreshold: number;
  /** Score above which confidence is 'high' */
  highConfidenceThreshold: number;
  /** Score above which confidence is 'medium' */
  mediumConfidenceThreshold: number;
  /** Maximum number of vendors to recommend */
  maxRecommendations: number;
}

// ===========================================
// MATCHING CONTEXT
// ===========================================

/**
 * Context data needed for calculating match scores
 */
export interface MatchingContext {
  /** The service request to match */
  request: ServiceRequest;
  /** Extracted zip code from request */
  zipCode: string | null;
  /** Service category from request */
  serviceType: ServiceCategory;
  /** Urgency level from request */
  urgency: UrgencyLevel;
  /** Budget range from request (if provided) */
  budgetRange: BudgetRange | null;
  /** Service details/specialties requested */
  serviceDetails: Record<string, string> | null;
  /** Whether this is an emergency request */
  isEmergency: boolean;
}

/**
 * Vendor data enriched with metrics for scoring
 */
export interface VendorMatchData extends Vendor {
  /** Number of pending/in-progress jobs */
  pendingJobsCount: number;
  /** Average response time in hours (if available) */
  avgResponseTimeHours: number | null;
  /** Match acceptance rate */
  acceptanceRate: number | null;
  /** Job completion rate */
  completionRate: number | null;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

/**
 * Response from the suggestions API
 */
export interface SuggestionsResponse {
  /** The request being matched */
  request: {
    id: string;
    service_type: ServiceCategory;
    property_location: string;
    zip_code: string | null;
    urgency: UrgencyLevel;
  };
  /** Top suggested vendors with scores */
  suggestions: VendorWithMatchScore[];
  /** All other eligible vendors with scores (sorted by score) */
  otherVendors: VendorWithMatchScore[];
  /** Metadata about the matching */
  meta: {
    totalEligible: number;
    totalRecommended: number;
    averageScore: number;
    scoringVersion: string;
  };
}

// ===========================================
// FACTOR CALCULATION INPUTS
// ===========================================

/**
 * Input for service match factor
 */
export interface ServiceMatchInput {
  vendorServices: ServiceCategory[];
  requestedService: ServiceCategory;
}

/**
 * Input for location match factor
 */
export interface LocationMatchInput {
  vendorServiceAreas: string[];
  requestZipCode: string | null;
  requestLocation: string;
}

/**
 * Input for availability/urgency match factor
 */
export interface AvailabilityMatchInput {
  vendorEmergencyServices: boolean;
  vendorServiceHours: {
    weekdays: boolean;
    weekends: boolean;
    is24_7: boolean;
  };
  requestUrgency: UrgencyLevel;
  isWeekend: boolean;
}

/**
 * Input for specialty match factor
 */
export interface SpecialtyMatchInput {
  vendorSpecialties: Record<ServiceCategory, string[]> | null;
  requestedService: ServiceCategory;
  requestServiceDetails: Record<string, string> | null;
}

/**
 * Input for capacity factor
 */
export interface CapacityInput {
  pendingJobsCount: number;
}

/**
 * Input for price fit factor
 */
export interface PriceFitInput {
  vendorJobSizeRange: string[] | null;
  requestBudgetRange: BudgetRange | null;
}
