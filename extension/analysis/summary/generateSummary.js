/**
 * @module analysis/summary/generateSummary
 * @description Aggregates existing detector outputs into an explainable summary.
 * Performs no new detection, scoring, or AI inference.
 */

import { computeStatistics } from './statistics.js';
import { determineOverallAssessment } from './assessment.js';
import { buildEvidence } from './evidence.js';
import { buildLimitations } from './limitations.js';

/**
 * @typedef {import('./types.js').AnalyzedReview} AnalyzedReview
 * @typedef {import('./types.js').SummaryResult} SummaryResult
 */

/**
 * @param {AnalyzedReview[]} analyzedReviews
 * @returns {SummaryResult}
 */
export function generateSummary(analyzedReviews) {
  if (!Array.isArray(analyzedReviews)) {
    console.warn('[Summary] Expected an array of analyzed reviews, received:', typeof analyzedReviews);
    return createEmptySummary();
  }

  const statistics = computeStatistics(analyzedReviews);

  return {
    overallAssessment: determineOverallAssessment(statistics),
    evidence: buildEvidence(analyzedReviews),
    limitations: buildLimitations(analyzedReviews),
    statistics,
  };
}

/**
 * @returns {SummaryResult}
 */
function createEmptySummary() {
  const statistics = {
    totalReviews: 0,
    ratingMismatches: 0,
    duplicateReviews: 0,
    verifiedPurchases: 0,
  };

  return {
    overallAssessment: determineOverallAssessment(statistics),
    evidence: [],
    limitations: buildLimitations([]),
    statistics,
  };
}
