/**
 * @module analysis/summary/assessment
 * @description Deterministic overall assessment rules based on detector outputs.
 */

/**
 * @typedef {import('./types.js').SummaryStatistics} SummaryStatistics
 */

/**
 * @param {SummaryStatistics} statistics
 * @returns {string}
 */
export function determineOverallAssessment(statistics) {
  const signalCount = statistics.ratingMismatches + statistics.duplicateReviews;
  const signalTypes = countActiveSignalTypes(statistics);

  if (signalCount === 0) {
    return 'No significant authenticity concerns detected.';
  }

  if (signalTypes >= 2 || signalCount >= 3) {
    return 'Multiple authenticity signals were detected.';
  }

  return 'Read this product skeptically.';
}

/**
 * @param {SummaryStatistics} statistics
 * @returns {number}
 */
function countActiveSignalTypes(statistics) {
  let types = 0;

  if (statistics.ratingMismatches > 0) types++;
  if (statistics.duplicateReviews > 0) types++;

  return types;
}
