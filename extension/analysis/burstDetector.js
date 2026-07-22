/**
 * @module analysis/burstDetector
 * @description Detects abnormal temporal bursts in review submission times.
 *
 * A "review burst" occurs when an unusually large number of reviews are
 * submitted within a very short time window — a hallmark of coordinated
 * fake review campaigns. Burst detection requires review dates, which are
 * extracted from the page.
 *
 * Algorithm (Phase 2):
 * 1. Filter reviews with parseable dateMs values.
 * 2. Sort by dateMs ascending.
 * 3. Apply a sliding window of configurable duration.
 * 4. Windows whose review count exceeds a z-score threshold are flagged.
 *
 * WHY z-score instead of a fixed threshold:
 * - Products with thousands of reviews naturally get many per day.
 * - A fixed threshold (e.g., "10 reviews in one day") would produce false
 *   positives for popular products and false negatives for obscure ones.
 * - Z-score adapts to the product's baseline review velocity.
 *
 * Foundation phase:
 * - LIMITS.MIN_REVIEWS_FOR_BURST is enforced before analysis.
 * - Returns empty array until Phase 2 implementation.
 */

import { SIGNALS, SEVERITY, LIMITS } from '../utils/constants.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} BurstSignal
 * @property {string}   type       - Always SIGNALS.BURST_ACTIVITY.
 * @property {string}   reviewId   - ID of a review in the burst window.
 * @property {string}   severity   - SEVERITY constant.
 * @property {string}   rationale  - Human-readable explanation.
 * @property {Object}   detail
 * @property {number}   detail.windowStartMs  - Burst window start (UTC ms).
 * @property {number}   detail.windowEndMs    - Burst window end (UTC ms).
 * @property {number}   detail.count          - Reviews in the window.
 * @property {number}   detail.zScore         - Deviation from baseline.
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes review timestamps for abnormal submission bursts.
 *
 * @param {import('../models/review.js').Review[]} reviews
 * @returns {BurstSignal[]}
 */
export function detectBursts(reviews) {
  if (!reviews?.length || reviews.length < LIMITS.MIN_REVIEWS_FOR_BURST) {
    console.debug('[BurstDetector] Insufficient reviews for burst analysis:', reviews?.length ?? 0);
    return [];
  }

  const datedReviews = reviews.filter(r => r.dateMs !== null);

  if (datedReviews.length < LIMITS.MIN_REVIEWS_FOR_BURST) {
    console.debug('[BurstDetector] Insufficient dated reviews for analysis:', datedReviews.length);
    return [];
  }

  // TODO(Phase 2): Implement sliding-window burst detection with z-score scoring.
  return [];
}
