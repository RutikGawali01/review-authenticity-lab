/**
 * @module analysis/summary/statistics
 * @description Counts authenticity-related statistics from analyzed reviews.
 */

/**
 * @typedef {import('./types.js').AnalyzedReview} AnalyzedReview
 * @typedef {import('./types.js').SummaryStatistics} SummaryStatistics
 */

/**
 * @param {AnalyzedReview[]} analyzedReviews
 * @returns {SummaryStatistics}
 */
export function computeStatistics(analyzedReviews) {
  const reviews = Array.isArray(analyzedReviews) ? analyzedReviews : [];

  let ratingMismatches = 0;
  let duplicateReviews = 0;
  let verifiedPurchases = 0;

  for (const review of reviews) {
    if (review.ratingMismatch?.detected) {
      ratingMismatches++;
    }

    if (review.duplicateDetection?.detected) {
      duplicateReviews++;
    }

    const verified = review.reviewerPattern?.verifiedPurchase ?? review.verifiedPurchase;
    if (verified === true) {
      verifiedPurchases++;
    }
  }

  return {
    totalReviews: reviews.length,
    ratingMismatches,
    duplicateReviews,
    verifiedPurchases,
  };
}
