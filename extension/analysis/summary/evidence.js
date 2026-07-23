/**
 * @module analysis/summary/evidence
 * @description Builds human-readable evidence strings from existing detector results.
 */

/**
 * @typedef {import('./types.js').AnalyzedReview} AnalyzedReview
 */

/**
 * @param {AnalyzedReview[]} analyzedReviews
 * @returns {string[]}
 */
export function buildEvidence(analyzedReviews) {
  const reviews = Array.isArray(analyzedReviews) ? analyzedReviews : [];
  const evidence = [];

  appendRatingMismatchEvidence(reviews, evidence);
  appendDuplicateEvidence(reviews, evidence);
  appendVerifiedPurchaseEvidence(reviews, evidence);

  return evidence;
}

/**
 * @param {AnalyzedReview[]} reviews
 * @param {string[]} evidence
 */
function appendRatingMismatchEvidence(reviews, evidence) {
  const mismatches = reviews.filter((review) => review.ratingMismatch?.detected);

  if (mismatches.length === 0) return;

  const suffix = mismatches.length === 1 ? 'review shows' : 'reviews show';
  evidence.push(
    `${mismatches.length} ${suffix} a star rating that conflicts with the review text sentiment.`
  );
}

/**
 * @param {AnalyzedReview[]} reviews
 * @param {string[]} evidence
 */
function appendDuplicateEvidence(reviews, evidence) {
  const clusterSizes = new Map();

  for (const review of reviews) {
    const duplicate = review.duplicateDetection;
    if (!duplicate?.detected || !duplicate.clusterId) continue;

    const current = clusterSizes.get(duplicate.clusterId) ?? 0;
    clusterSizes.set(duplicate.clusterId, current + 1);
  }

  if (clusterSizes.size === 0) return;

  const clusterCount = clusterSizes.size;
  const clusterLabel = clusterCount === 1 ? 'group' : 'groups';
  evidence.push(
    `${clusterCount} near-duplicate review ${clusterLabel} ${clusterCount === 1 ? 'was' : 'were'} detected.`
  );
}

/**
 * @param {AnalyzedReview[]} reviews
 * @param {string[]} evidence
 */
function appendVerifiedPurchaseEvidence(reviews, evidence) {
  let unverifiedCount = 0;
  let unknownCount = 0;

  for (const review of reviews) {
    const verified = review.reviewerPattern?.verifiedPurchase ?? review.verifiedPurchase;

    if (verified === false) unverifiedCount++;
    if (verified === null || verified === undefined) unknownCount++;
  }

  if (unverifiedCount > 0) {
    const suffix = unverifiedCount === 1 ? 'review is' : 'reviews are';
    evidence.push(`${unverifiedCount} ${suffix} not marked as verified purchases.`);
  }

  if (unknownCount > 0) {
    const suffix = unknownCount === 1 ? 'review has' : 'reviews have';
    evidence.push(`${unknownCount} ${suffix} unknown verified-purchase status.`);
  }
}
