import {
  getProductReviewPageUrl,
  findShowMoreButton,
  waitForNewContainers,
  paginateReviewPage,
  getNextPageUrl
} from '../extension/content/pagination/paginator.js';
import { AMAZON_PAGE_TYPES, MAX_REVIEWS, LIMITS } from '../extension/utils/constants.js';

console.log('--- 1. Testing MAX_REVIEWS Constant ---');
console.log('MAX_REVIEWS value:', MAX_REVIEWS);
console.log('LIMITS.MAX_PAGINATION_REVIEWS value:', LIMITS.MAX_PAGINATION_REVIEWS);

if (MAX_REVIEWS === 200 && LIMITS.MAX_PAGINATION_REVIEWS === 200) {
  console.log('✓ MAX_REVIEWS correctly configured to 200!');
} else {
  console.error('❌ MAX_REVIEWS check failed.');
}

console.log('\n--- 2. Testing Paginator Exports ---');
console.log('getProductReviewPageUrl:', typeof getProductReviewPageUrl === 'function');
console.log('findShowMoreButton:', typeof findShowMoreButton === 'function');
console.log('waitForNewContainers:', typeof waitForNewContainers === 'function');
console.log('paginateReviewPage:', typeof paginateReviewPage === 'function');
console.log('getNextPageUrl:', typeof getNextPageUrl === 'function');

console.log('\n--- 3. Testing getNextPageUrl Dispatcher ---');
const productUrl = getNextPageUrl(null, AMAZON_PAGE_TYPES.PRODUCT_PAGE, 'https://www.amazon.com/dp/B000000000');
const reviewUrl = getNextPageUrl(null, AMAZON_PAGE_TYPES.REVIEWS_PAGE, 'https://www.amazon.com/portal/customer-reviews/B000000000');

console.log('Product Page Next Page URL:', productUrl);
console.log('Review Page Next Page URL (expected null):', reviewUrl);

if (reviewUrl === null) {
  console.log('\n✓ DOM Pagination module API verified successfully!');
} else {
  console.error('\n❌ Test failed: reviewUrl should be null for Review Pages.');
}
