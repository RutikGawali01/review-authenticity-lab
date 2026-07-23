import { mergeReviews } from '../extension/utils/mergeReviews.js';
import { LIMITS } from '../extension/utils/constants.js';

console.log('--- Multi-Page Extraction Background Loop Test ---');

let accumulatedReviews = [];
let pageCount = 0;
const maxPages = LIMITS.MAX_PAGINATION_PAGES || 5;
const maxReviews = LIMITS.MAX_PAGINATION_REVIEWS || 100;

// Simulated multi-page response payload stream
const mockPages = [
  {
    reviews: [{ reviewId: 'REV1', text: 'Page 1 text' }, { reviewId: 'REV2', text: 'Page 1 text 2' }],
    nextPageUrl: 'https://www.amazon.in/product-reviews/ASIN?pageNumber=2',
  },
  {
    reviews: [{ reviewId: 'REV2', text: 'Duplicate REV2' }, { reviewId: 'REV3', text: 'Page 2 text' }],
    nextPageUrl: 'https://www.amazon.in/product-reviews/ASIN?pageNumber=3',
  },
  {
    reviews: [{ reviewId: 'REV4', text: 'Page 3 text' }],
    nextPageUrl: null, // End of pages
  },
];

for (const pagePayload of mockPages) {
  pageCount++;
  console.log(`\nProcessing Page ${pageCount}...`);
  console.log(`Page ${pageCount} Extracted Count:`, pagePayload.reviews.length);

  accumulatedReviews = mergeReviews(accumulatedReviews, pagePayload.reviews);
  console.log(`Total Merged Count So Far:`, accumulatedReviews.length);

  const nextPageUrl = pagePayload.nextPageUrl;
  console.log(`Next Page URL:`, nextPageUrl || 'None');

  if (!nextPageUrl || pageCount >= maxPages || accumulatedReviews.length >= maxReviews) {
    break;
  }
}

console.log('\n--- Final Pagination Summary ---');
console.log('Total Pages Processed:', pageCount);
console.log('Total Unique Reviews Merged:', accumulatedReviews.length);
console.log('Review IDs:', accumulatedReviews.map(r => r.reviewId));

if (accumulatedReviews.length === 4 && pageCount === 3) {
  console.log('\n✓ Multi-page background coordination test PASSED!');
} else {
  console.error('\n❌ Multi-page test failed');
}
