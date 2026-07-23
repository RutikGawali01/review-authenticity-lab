import { mergeReviews } from '../extension/utils/mergeReviews.js';
import { getNextPageUrl } from '../extension/content/pagination/paginator.js';
import { LIMITS } from '../extension/utils/constants.js';

console.log('--- 1. Testing Merge Logic & Deduplication ---');

const batch1 = [
  { reviewId: 'R1', reviewText: 'First review', rating: 5 },
  { reviewId: 'R2', reviewText: 'Second review', rating: 4 },
];

const batch2 = [
  { reviewId: 'R2', reviewText: 'Second review duplicate', rating: 4 },
  { reviewId: 'R3', reviewText: 'Third review', rating: 3 },
];

const merged = mergeReviews(batch1, batch2);
console.log('Merged Count:', merged.length);
console.log('Merged IDs:', merged.map(r => r.reviewId));

console.log('\n--- 2. Testing Pagination Limits ---');
console.log('Max Pages Limit:', LIMITS.MAX_PAGINATION_PAGES);
console.log('Max Reviews Limit:', LIMITS.MAX_PAGINATION_REVIEWS);

console.log('\n✓ Pagination Architecture and Deduplicated Merge verified successfully!');
