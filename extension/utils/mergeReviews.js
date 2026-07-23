/**
 * @module utils/mergeReviews
 * @description Deduplicates and merges arrays of review objects using reviewId as unique key.
 */

/**
 * Merges multiple review arrays into a single deduplicated array.
 * Preserves insertion order, keeping the first encountered instance of each reviewId.
 *
 * @param {...(Array<Object>|Object)} sources - Arrays of reviews or individual review objects.
 * @returns {Array<Object>} Deduplicated array of review objects.
 */
export function mergeReviews(...sources) {
  const mergedMap = new Map();

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (!source) continue;
    const items = Array.isArray(source) ? source : [source];

    for (let j = 0; j < items.length; j++) {
      const review = items[j];
      if (!review || typeof review !== 'object') continue;
      const key = review.reviewId || review.id;
      if (!key) continue;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, review);
      }
    }
  }

  return Array.from(mergedMap.values());
}
