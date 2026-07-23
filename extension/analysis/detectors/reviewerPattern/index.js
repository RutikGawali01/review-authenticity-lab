/**
 * @module analysis/detectors/reviewerPattern
 * @description Extracts and normalizes reviewer metadata from the current review.
 * Honest reporting: explicitly marks unavailable data (like history or age) as "unknown"
 * rather than fabricating or inferring it. Does not scrape additional pages.
 */

/**
 * @typedef {import('../../../models/review.js').Review} Review
 *
 * @typedef {Object} ReviewerPatternResult
 * @property {boolean|null} verifiedPurchase
 * @property {string|null} [reviewerName]
 * @property {boolean} profileAvailable
 * @property {{ available: boolean, status: 'available'|'unknown' }} reviewerHistory
 * @property {{ available: boolean, status: 'available'|'unknown' }} accountAge
 */

/**
 * Analyzes the available reviewer metadata for a given review.
 * Since we do not scrape additional pages, deep reviewer history and account age
 * are marked as unknown by default.
 *
 * @param {Review} review - The raw review object.
 * @returns {ReviewerPatternResult} The normalized reviewer pattern result.
 */
export function detectReviewerPattern(review) {
  // We check if the review author exists and is not just "Amazon Customer" etc.,
  // though for this step we simply pass the string through.
  const hasName = Boolean(review.author && review.author.trim().length > 0);
  
  // Note: if the scraper eventually extracts authorProfileUrl, we could set profileAvailable to true.
  // Currently, the Review model does not guarantee an author URL, so we default to false.
  const profileAvailable = Boolean(review.authorProfileUrl);

  return {
    verifiedPurchase: typeof review.verifiedPurchase === 'boolean' ? review.verifiedPurchase : null,
    reviewerName: hasName ? review.author : null,
    profileAvailable: profileAvailable,
    
    // We are analyzing ONLY the current page. We do not perform network requests
    // to check history or account age. We report this honestly.
    reviewerHistory: {
      available: false,
      status: 'unknown',
    },
    accountAge: {
      available: false,
      status: 'unknown',
    },
  };
}
