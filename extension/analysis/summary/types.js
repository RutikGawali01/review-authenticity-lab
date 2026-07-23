/**
 * @module analysis/summary/types
 * @description Shared type definitions for the summary generator output.
 */

/**
 * @typedef {import('../pipeline/reviewAnalysisPipeline.js').AnalyzedReview} AnalyzedReview
 *
 * @typedef {Object} SummaryStatistics
 * @property {number} totalReviews
 * @property {number} ratingMismatches
 * @property {number} duplicateReviews
 * @property {number} verifiedPurchases
 *
 * @typedef {Object} SummaryResult
 * @property {string} overallAssessment
 * @property {string[]} evidence
 * @property {string[]} limitations
 * @property {SummaryStatistics} statistics
 */

export {};
