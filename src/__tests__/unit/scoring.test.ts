/**
 * Tests for Vendor Performance Scoring System
 */

import {
  calculateVendorScore,
  VendorMetrics,
  SCORING_WEIGHTS,
  REVIEW_CONFIG,
  SCORE_BOUNDS,
  getScoreTier,
} from '@/lib/scoring';

describe('Vendor Scoring System', () => {
  // Helper to create a review with multi-dimensional fields
  const createReview = (rating: number, createdAt: Date = new Date()) => ({
    rating,
    quality: null,
    price: null,
    timeline: null,
    treatment: null,
    createdAt,
  });

  // Helper to create test metrics
  const createMetrics = (overrides: Partial<VendorMetrics> = {}): VendorMetrics => ({
    vendorId: 'test-vendor-1',
    reviews: [],
    totalMatches: 0,
    acceptedJobs: 0,
    completedJobs: 0,
    noShows: 0,
    declinesAfterAccept: 0,
    responseTimes: [],
    vettingScore: null,
    lastActivityDate: null,
    ...overrides,
  });

  describe('New vendor with no data', () => {
    it('returns default score of 50', () => {
      const metrics = createMetrics();
      const result = calculateVendorScore(metrics);
      expect(result.score).toBe(50);
    });

    it('has zero confidence', () => {
      const metrics = createMetrics();
      const result = calculateVendorScore(metrics);
      expect(result.breakdown.confidence).toBe(0);
    });
  });

  describe('Review scoring', () => {
    it('5-star reviews increase score above 50', () => {
      const metrics = createMetrics({
        reviews: [
          createReview(5),
          createReview(5),
          createReview(5),
          createReview(5),
          createReview(5),
        ],
      });
      const result = calculateVendorScore(metrics);
      // Score increases above default 50 due to good reviews
      expect(result.score).toBeGreaterThan(60);
    });

    it('1-star reviews decrease score below 50', () => {
      const metrics = createMetrics({
        reviews: [
          createReview(1),
          createReview(1),
          createReview(1),
          createReview(1),
          createReview(1),
        ],
      });
      const result = calculateVendorScore(metrics);
      expect(result.score).toBeLessThan(40);
    });

    it('3-star reviews result in around default score', () => {
      const metrics = createMetrics({
        reviews: [
          createReview(3),
          createReview(3),
          createReview(3),
          createReview(3),
          createReview(3),
        ],
      });
      const result = calculateVendorScore(metrics);
      // 3 stars = 50/100 for review component, but other factors pull it slightly
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(55);
    });

    it('weights recent reviews more heavily', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200); // 200 days ago

      // All good reviews, but one is recent and one is old
      const metricsRecentGood = createMetrics({
        reviews: [
          createReview(5), // Recent good
          createReview(3, oldDate),
          createReview(3, oldDate),
        ],
      });

      const metricsOldGood = createMetrics({
        reviews: [
          createReview(3), // Recent average
          createReview(5, oldDate),
          createReview(5, oldDate),
        ],
      });

      const resultRecentGood = calculateVendorScore(metricsRecentGood);
      const resultOldGood = calculateVendorScore(metricsOldGood);

      // Recent good review should have more impact than old good reviews
      expect(resultRecentGood.breakdown.reviewScore).toBeGreaterThan(resultOldGood.breakdown.reviewScore);
    });
  });

  describe('Confidence dampening', () => {
    it('1 review has low confidence', () => {
      const metrics = createMetrics({
        reviews: [createReview(5)],
      });
      const result = calculateVendorScore(metrics);
      expect(result.breakdown.confidence).toBe(1 / REVIEW_CONFIG.minReviewsForFullWeight);
    });

    it('5+ reviews have full confidence', () => {
      const metrics = createMetrics({
        reviews: Array(5).fill(null).map(() => (createReview(5))),
      });
      const result = calculateVendorScore(metrics);
      expect(result.breakdown.confidence).toBe(1);
    });

    it('single 5-star review does not give max score due to dampening', () => {
      const metrics = createMetrics({
        reviews: [createReview(5)],
      });
      const result = calculateVendorScore(metrics);
      // With dampening, score should be pulled toward 50
      expect(result.score).toBeLessThan(75);
      expect(result.score).toBeGreaterThan(50);
    });
  });

  describe('Completion and acceptance rates', () => {
    it('high completion rate improves score', () => {
      const metricsHigh = createMetrics({
        reviews: [createReview(4)],
        totalMatches: 10,
        acceptedJobs: 10,
        completedJobs: 10,
        lastActivityDate: new Date(),
      });

      const metricsLow = createMetrics({
        reviews: [createReview(4)],
        totalMatches: 10,
        acceptedJobs: 10,
        completedJobs: 5,
        lastActivityDate: new Date(),
      });

      const resultHigh = calculateVendorScore(metricsHigh);
      const resultLow = calculateVendorScore(metricsLow);

      expect(resultHigh.breakdown.completionScore).toBeGreaterThan(resultLow.breakdown.completionScore);
    });

    it('high acceptance rate improves score', () => {
      const metricsHigh = createMetrics({
        reviews: [createReview(4)],
        totalMatches: 10,
        acceptedJobs: 9,
        completedJobs: 9,
        lastActivityDate: new Date(),
      });

      const metricsLow = createMetrics({
        reviews: [createReview(4)],
        totalMatches: 10,
        acceptedJobs: 3,
        completedJobs: 3,
        lastActivityDate: new Date(),
      });

      const resultHigh = calculateVendorScore(metricsHigh);
      const resultLow = calculateVendorScore(metricsLow);

      expect(resultHigh.breakdown.acceptanceScore).toBeGreaterThan(resultLow.breakdown.acceptanceScore);
    });
  });

  describe('Penalties', () => {
    it('no-shows reduce score', () => {
      const metricsNoNoShows = createMetrics({
        reviews: Array(5).fill(null).map(() => (createReview(4))),
        totalMatches: 5,
        acceptedJobs: 5,
        completedJobs: 5,
        noShows: 0,
      });

      const metricsWithNoShows = createMetrics({
        reviews: Array(5).fill(null).map(() => (createReview(4))),
        totalMatches: 5,
        acceptedJobs: 5,
        completedJobs: 3,
        noShows: 2,
      });

      const resultNoNoShows = calculateVendorScore(metricsNoNoShows);
      const resultWithNoShows = calculateVendorScore(metricsWithNoShows);

      expect(resultWithNoShows.breakdown.penalties).toBeGreaterThan(0);
      expect(resultWithNoShows.score).toBeLessThan(resultNoNoShows.score);
    });

    it('1-star reviews add extra penalty', () => {
      const metricsNoOneStar = createMetrics({
        reviews: Array(5).fill(null).map(() => (createReview(2))),
      });

      const metricsWithOneStar = createMetrics({
        reviews: [
          createReview(1),
          createReview(2),
          createReview(2),
          createReview(2),
          createReview(2),
        ],
      });

      const resultNoOneStar = calculateVendorScore(metricsNoOneStar);
      const resultWithOneStar = calculateVendorScore(metricsWithOneStar);

      expect(resultWithOneStar.breakdown.penalties).toBeGreaterThan(resultNoOneStar.breakdown.penalties);
    });
  });

  describe('Volume and recency bonuses', () => {
    it('more completed jobs increase volume bonus', () => {
      const metricsLow = createMetrics({
        reviews: [createReview(4)],
        completedJobs: 2,
      });

      const metricsHigh = createMetrics({
        reviews: [createReview(4)],
        completedJobs: 15,
      });

      const resultLow = calculateVendorScore(metricsLow);
      const resultHigh = calculateVendorScore(metricsHigh);

      expect(resultHigh.breakdown.volumeBonus).toBeGreaterThan(resultLow.breakdown.volumeBonus);
    });

    it('recent activity gives recency bonus', () => {
      const metricsRecent = createMetrics({
        reviews: [createReview(4)],
        lastActivityDate: new Date(),
      });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200);
      const metricsOld = createMetrics({
        reviews: [createReview(4, oldDate)],
        lastActivityDate: oldDate,
      });

      const resultRecent = calculateVendorScore(metricsRecent);
      const resultOld = calculateVendorScore(metricsOld);

      expect(resultRecent.breakdown.recencyBonus).toBeGreaterThan(resultOld.breakdown.recencyBonus);
    });
  });

  describe('Score bounds', () => {
    it('score never exceeds 100', () => {
      const metrics = createMetrics({
        reviews: Array(20).fill(null).map(() => (createReview(5))),
        totalMatches: 100,
        acceptedJobs: 100,
        completedJobs: 100,
        noShows: 0,
        lastActivityDate: new Date(),
      });
      const result = calculateVendorScore(metrics);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('score never goes below 0', () => {
      const metrics = createMetrics({
        reviews: Array(20).fill(null).map(() => (createReview(1))),
        totalMatches: 100,
        acceptedJobs: 10,
        completedJobs: 0,
        noShows: 10,
        lastActivityDate: null,
      });
      const result = calculateVendorScore(metrics);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Score tiers', () => {
    it('returns "new" for vendors with no reviews', () => {
      expect(getScoreTier(50, false)).toBe('new');
    });

    it('returns "excellent" for high scores', () => {
      expect(getScoreTier(90, true)).toBe('excellent');
    });

    it('returns "good" for good scores', () => {
      expect(getScoreTier(75, true)).toBe('good');
    });

    it('returns "average" for middle scores', () => {
      expect(getScoreTier(55, true)).toBe('average');
    });

    it('returns "below_average" for low scores', () => {
      expect(getScoreTier(40, true)).toBe('below_average');
    });

    it('returns "poor" for very low scores', () => {
      expect(getScoreTier(20, true)).toBe('poor');
    });
  });

  describe('Weights sum to 1', () => {
    it('all scoring weights sum to 1.0', () => {
      const total = Object.values(SCORING_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });
  });
});
