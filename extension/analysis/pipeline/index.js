/**
 * @module analysis/pipeline
 * @description Public API for the review processing pipeline.
 */

import { analyzeReviews } from './reviewAnalysisPipeline.js';
import { generateSummary } from '../summary/index.js';

export { analyzeReviews, generateSummary };

/**
 * Runs the full analysis pipeline and aggregates results into a summary report.
 *
 * @param {import('./reviewAnalysisPipeline.js').Review[]} reviews
 * @returns {Promise<{ analyzedReviews: import('./reviewAnalysisPipeline.js').AnalyzedReview[], summary: import('../summary/types.js').SummaryResult }>}
 */
export async function analyzeAndSummarize(reviews) {
  const analyzedReviews = await analyzeReviews(reviews);
  return {
    analyzedReviews,
    summary: generateSummary(analyzedReviews),
  };
}
