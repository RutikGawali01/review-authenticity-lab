/**
 * @module analysis/detectors/ratingMismatch
 * @description Detects conflicts between a review's star rating and its text sentiment.
 */

import { SEVERITY } from '../../../utils/constants.js';

/**
 * @typedef {Object} RatingMismatchResult
 * @property {boolean} detected
 * @property {'low'|'medium'|'high'} [severity]
 * @property {number} [confidence]
 * @property {string} [reason]
 */

/** Minimum confidence threshold for the sentiment prediction to be trusted. */
const MIN_SENTIMENT_CONFIDENCE = 0.80;

/**
 * Detects obvious contradictions between star rating and sentiment.
 * 
 * Rules:
 * - 5★ + Negative -> High severity
 * - 1★ + Positive -> High severity
 * - 4★ + Negative -> Medium severity
 * - 2★ + Positive -> Medium severity
 *
 * @param {number} rating - The review's numeric star rating (1-5).
 * @param {import('../../sentiment/sentimentAnalyzer.js').SentimentResult} sentiment - The detected sentiment.
 * @returns {RatingMismatchResult}
 */
export function detectRatingMismatch(rating, sentiment) {
  if (!sentiment || sentiment.confidence < MIN_SENTIMENT_CONFIDENCE) {
    return { detected: false };
  }

  const { label, confidence } = sentiment;

  if (rating === 5 && label === 'negative') {
    return {
      detected: true,
      severity: SEVERITY.HIGH,
      confidence,
      reason: '5-star rating with strongly negative text.',
    };
  }

  if (rating === 1 && label === 'positive') {
    return {
      detected: true,
      severity: SEVERITY.HIGH,
      confidence,
      reason: '1-star rating with strongly positive text.',
    };
  }

  if (rating === 4 && label === 'negative') {
    return {
      detected: true,
      severity: SEVERITY.MEDIUM,
      confidence,
      reason: '4-star rating with negative text.',
    };
  }

  if (rating === 2 && label === 'positive') {
    return {
      detected: true,
      severity: SEVERITY.MEDIUM,
      confidence,
      reason: '2-star rating with positive text.',
    };
  }

  return { detected: false };
}
