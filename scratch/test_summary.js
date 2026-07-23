/**
 * @file scratch/test_summary.js
 * @description Verifies summary generator aggregation from mock analyzed reviews.
 */

import { generateSummary } from '../extension/analysis/summary/index.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mockReviews = [
  {
    id: 'r1',
    body: 'Terrible product, broke immediately.',
    rating: 5,
    verifiedPurchase: false,
    sentiment: { label: 'negative', confidence: 0.95 },
    ratingMismatch: {
      detected: true,
      severity: 'high',
      reason: '5-star rating with strongly negative text.',
    },
    duplicateDetection: { detected: false },
    reviewerPattern: {
      verifiedPurchase: false,
      profileAvailable: false,
      reviewerHistory: { available: false, status: 'unknown' },
      accountAge: { available: false, status: 'unknown' },
    },
  },
  {
    id: 'r2',
    body: 'Terrible product, broke immediately after one day.',
    rating: 5,
    verifiedPurchase: true,
    sentiment: { label: 'negative', confidence: 0.91 },
    ratingMismatch: {
      detected: true,
      severity: 'high',
      reason: '5-star rating with strongly negative text.',
    },
    duplicateDetection: {
      detected: true,
      clusterId: 'cluster-1',
      similarity: 0.82,
      matchedReviewIds: ['r1'],
    },
    reviewerPattern: {
      verifiedPurchase: true,
      profileAvailable: false,
      reviewerHistory: { available: false, status: 'unknown' },
      accountAge: { available: false, status: 'unknown' },
    },
  },
];

const summary = generateSummary(mockReviews);

assert(summary.overallAssessment === 'Multiple authenticity signals were detected.', 'Expected multi-signal assessment');
assert(summary.statistics.totalReviews === 2, 'Expected 2 total reviews');
assert(summary.statistics.ratingMismatches === 2, 'Expected 2 rating mismatches');
assert(summary.statistics.duplicateReviews === 1, 'Expected 1 duplicate review');
assert(summary.statistics.verifiedPurchases === 1, 'Expected 1 verified purchase');
assert(summary.evidence.length >= 2, 'Expected evidence entries');
assert(summary.limitations.some((item) => item.includes('posting history')), 'Expected history limitation');

console.log('[test_summary] All assertions passed.');
console.log(JSON.stringify(summary, null, 2));
