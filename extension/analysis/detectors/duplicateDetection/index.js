/**
 * @module analysis/detectors/duplicateDetection
 * @description Detects near-duplicate and templated reviews using token-based Jaccard similarity.
 * Groups matching reviews into clusters.
 */

import { LIMITS } from '../../../utils/constants.js';

/**
 * @typedef {import('../../../models/review.js').Review} Review
 * 
 * @typedef {Object} DuplicateDetectionResult
 * @property {boolean} detected
 * @property {string} [clusterId]
 * @property {number} [similarity]
 * @property {string[]} [matchedReviewIds]
 */

/**
 * Normalizes a review's text for comparison.
 * Converts to lowercase, removes punctuation, and normalizes whitespace.
 *
 * @param {string} text
 * @returns {Set<string>|null} A set of unique tokens, or null if too short.
 */
function getTokens(text) {
  if (!text || typeof text !== 'string') return null;
  
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')      // Collapse whitespace
    .trim();

  if (normalized.length < 10) return null; // Ignore extremely short reviews

  return new Set(normalized.split(' '));
}

/**
 * Calculates the Jaccard similarity between two token sets.
 * Similarity = Intersection / Union
 *
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} Value between 0.0 and 1.0
 */
function calculateJaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) intersectionSize++;
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Scans an array of reviews and groups near-duplicates into clusters.
 * Note: Assumes synchronous execution is safe because MAX_REVIEWS_PER_RUN is capped.
 *
 * @param {Review[]} reviews - The reviews to analyze.
 * @returns {Map<string, DuplicateDetectionResult>} Map of reviewId -> DuplicateDetectionResult
 */
export function detectDuplicates(reviews) {
  const results = new Map();
  
  // 1. Precompute tokens to avoid redundant regex/splits in the O(N^2) loop
  const tokenCache = new Map();
  for (const review of reviews) {
    const tokens = getTokens(review.body);
    if (tokens) tokenCache.set(review.id, tokens);
  }

  // Clusters: array of { id: string, members: string[] }
  const clusters = [];
  let nextClusterIdx = 1;

  // 2. Pairwise comparison to build clusters
  const validReviews = reviews.filter(r => tokenCache.has(r.id));

  for (const review of validReviews) {
    const tokens = tokenCache.get(review.id);
    let joinedCluster = false;
    let highestSimilarity = 0;

    // Compare against existing clusters
    for (const cluster of clusters) {
      // Check similarity against the first member (representative) of the cluster
      const repTokens = tokenCache.get(cluster.members[0]);
      const similarity = calculateJaccardSimilarity(tokens, repTokens);

      if (similarity >= LIMITS.DUPLICATE_SIMILARITY_THRESHOLD) {
        cluster.members.push(review.id);
        highestSimilarity = Math.max(highestSimilarity, similarity);
        joinedCluster = true;
        
        // Record intermediate result (will be updated at the end)
        results.set(review.id, {
          detected: true,
          clusterId: cluster.id,
          similarity: Math.round(similarity * 100) / 100,
        });
        break; // Only join one cluster
      }
    }

    if (!joinedCluster) {
      // Create a new cluster
      clusters.push({
        id: `cluster-${nextClusterIdx++}`,
        members: [review.id],
      });
    }
  }

  // 3. Finalize results: only clusters with > 1 members are "detected"
  for (const cluster of clusters) {
    if (cluster.members.length > 1) {
      // Update each member with the full list of matched IDs
      for (const memberId of cluster.members) {
        const existing = results.get(memberId) || { detected: true, clusterId: cluster.id, similarity: 1.0 };
        existing.matchedReviewIds = cluster.members.filter(id => id !== memberId);
        results.set(memberId, existing);
      }
    } else {
      // Single member clusters are not duplicates
      results.set(cluster.members[0], { detected: false });
    }
  }

  // Ensure reviews without valid tokens at least get { detected: false }
  for (const review of reviews) {
    if (!results.has(review.id)) {
      results.set(review.id, { detected: false });
    }
  }

  return results;
}
