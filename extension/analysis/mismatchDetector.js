/**
 * @module analysis/mismatchDetector
 * @description Detects mismatches between a review's star rating and its text sentiment.
 *
 * A mismatch occurs when the expressed sentiment in the review body is
 * strongly inconsistent with the assigned star rating:
 *   - 5-star review with highly negative text → suspicious
 *   - 1-star review with highly positive text → suspicious
 *
 * This is a common pattern in fake-review farms where text is auto-generated
 * independently of the rating value.
 *
 * WHY a separate module from sentiment.js:
 * - sentiment.js is responsible for classifying text.
 * - mismatchDetector.js is responsible for interpreting that classification
 *   in context (the star rating). Single Responsibility Principle.
 */

import { SIGNALS, SEVERITY } from '../utils/constants.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} MismatchSignal
 * @property {string} type       - Always SIGNALS.SENTIMENT_MISMATCH.
 * @property {string} reviewId   - ID of the flagged review.
 * @property {string} severity   - SEVERITY constant.
 * @property {string} rationale  - Human-readable explanation.
 * @property {Object} detail
 * @property {string} detail.sentimentLabel - Detected sentiment.
 * @property {number} detail.sentimentScore - Confidence score.
 * @property {number} detail.rating         - The star rating.
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluates a set of sentiment results against their source reviews and
 * returns MismatchSignal objects for any detected mismatches.
 *
 * @param {import('./sentiment.js').SentimentResult[]} sentimentResults
 * @param {Map<string, import('../models/review.js').Review>} reviewMap
 *   - A Map from reviewId to Review, for O(1) lookups.
 * @returns {MismatchSignal[]}
 */
export function detectMismatches(sentimentResults, reviewMap) {
  const signals = [];

  for (const result of sentimentResults) {
    if (!result.mismatch) continue;

    const review = reviewMap.get(result.reviewId);
    if (!review) continue;

    const signal = buildMismatchSignal(result, review);
    if (signal) signals.push(signal);
  }

  return signals;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Builds a MismatchSignal from a sentiment result and its source review.
 * Returns null if the mismatch doesn't meet the confidence threshold.
 *
 * @param {import('./sentiment.js').SentimentResult} result
 * @param {import('../models/review.js').Review} review
 * @returns {MismatchSignal|null}
 */
function buildMismatchSignal(result, review) {
  // TODO(Phase 2): Apply confidence thresholds and compute severity.
  return {
    type:      SIGNALS.SENTIMENT_MISMATCH,
    reviewId:  review.id,
    severity:  SEVERITY.MEDIUM,
    rationale: `Sentiment (${result.label}) conflicts with ${review.rating}★ rating.`,
    detail: {
      sentimentLabel: result.label,
      sentimentScore: result.score,
      rating:         review.rating,
    },
  };
}
