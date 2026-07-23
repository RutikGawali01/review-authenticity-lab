/**
 * @module analysis/summary/limitations
 * @description Lists unavailable data and analysis scope constraints.
 */

/**
 * @typedef {import('./types.js').AnalyzedReview} AnalyzedReview
 */

/**
 * @param {AnalyzedReview[]} analyzedReviews
 * @returns {string[]}
 */
export function buildLimitations(analyzedReviews) {
  const reviews = Array.isArray(analyzedReviews) ? analyzedReviews : [];
  const limitations = [
    'Analysis is limited to reviews visible on the scraped product page.',
    'Reviewer posting history was not available for analysis.',
    'Reviewer account age was not available for analysis.',
    'Sentiment analysis may misclassify sarcasm, irony, or mixed-tone reviews.',
  ];

  if (hasUnavailableProfiles(reviews)) {
    limitations.push('Reviewer profile pages were not accessed during extraction.');
  }

  return limitations;
}

/**
 * @param {AnalyzedReview[]} reviews
 * @returns {boolean}
 */
function hasUnavailableProfiles(reviews) {
  return reviews.some((review) => review.reviewerPattern?.profileAvailable === false);
}
