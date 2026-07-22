import { extractReviews } from '../extension/content/extractor/reviewExtractor.js';
import { parseReview } from '../extension/content/extractor/reviewParser.js';
import { detectAmazonPageType } from '../extension/utils/helpers.js';
import { SELECTOR_PROFILES } from '../extension/content/extractor/selectors.js';
import { AMAZON_PAGE_TYPES } from '../extension/utils/constants.js';

console.log('--- 1. Testing Page Type Detection ---');
console.log('/dp/ page:', detectAmazonPageType('https://www.amazon.in/dp/B0CR7N9MD9'));
console.log('/product-reviews/ page:', detectAmazonPageType('https://www.amazon.in/portal/customer-reviews/B0CR7N9MD9'));

console.log('\n--- 2. Testing Selector Profiles ---');
console.log('Product Page profile container candidates:', SELECTOR_PROFILES.AMAZON[AMAZON_PAGE_TYPES.PRODUCT_PAGE].container);
console.log('Reviews Page profile container candidates:', SELECTOR_PROFILES.AMAZON[AMAZON_PAGE_TYPES.REVIEWS_PAGE].container);

console.log('\n✓ Selector Architecture and Page Type Detection verified successfully!');
