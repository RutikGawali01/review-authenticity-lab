/**
 * @module content/extractor/selectors
 * @description Centralized selector profiles and fallback candidates for review platforms.
 * Supports page-specific selector strategies (e.g. Amazon Product Page vs Customer Reviews Page).
 */

import { AMAZON_PAGE_TYPES } from '../../utils/constants.js';

/**
 * Page-specific selector profiles.
 * Each property maps to an ordered array of candidate selectors.
 * Selectors are evaluated sequentially; the first matching candidate is used.
 */
export const SELECTOR_PROFILES = Object.freeze({
  AMAZON: Object.freeze({
    [AMAZON_PAGE_TYPES.PRODUCT_PAGE]: Object.freeze({
      container: [
        '[data-hook="reviewContainer"]',
        '#localTopReviewsList [data-hook="reviewContainer"]',
        'li [data-hook="reviewContainer"]',
        '[data-hook="review"]',
        '#cm-cr-dp-review-list [data-hook="review"]',
        'div[id^="customer_review-"]',
        'div[data-cel-widget^="customer_review-"]',
      ],
      title: [
        '[data-hook="reviewTitle"]',
        'h4[data-hook="reviewTitle"]',
        '[data-hook="review-title"]',
      ],
      text: [
        '[data-hook="reviewText"]',
        '[data-hook="mobley-review-content"] [data-hook="reviewText"]',
        '[data-hook="review-body"] span',
        '.review-text-content span',
      ],
      rating: [
        '[data-hook="review-star-rating"]',
        '[data-hook="cmps-review-star-rating"]',
        '.a-icon-star',
      ],
      reviewer: [
        '[data-hook="review-by-line"] .a-profile-name',
        '.a-profile-name',
        '[data-hook="genome-widget"] .a-profile-name',
      ],
      date: [
        '[data-hook="review-date"]',
      ],
      verified: [
        '[data-hook="avp-badge"]',
        '[data-hook="avp-badge-link"]',
        '[data-hook="review-badges"]',
        '.mrsp-avp-badge-linkless',
        '.a-badge-text',
      ],
      helpful: [
        '[data-hook="helpful-vote-statement"]',
      ],
      profileLink: [
        'a.a-profile',
        '[data-hook="genome-widget"] a',
        '[data-hook="review-by-line"] a',
      ],
    }),

    [AMAZON_PAGE_TYPES.REVIEWS_PAGE]: Object.freeze({
      container: [
        'div[id^="customer_review-"]',
        'div[data-cel-widget^="customer_review-"]',
        '[data-hook="review"]',
        '[data-hook="reviewContainer"]',
      ],
      title: [
        '[data-hook="review-title"]',
        'a[data-hook="review-title"]',
        '[data-hook="reviewTitle"]',
      ],
      text: [
        '[data-hook="review-body"] span',
        '.review-text-content span',
        '[data-hook="reviewText"]',
      ],
      rating: [
        '[data-hook="review-star-rating"]',
        '[data-hook="cmps-review-star-rating"]',
        '.a-icon-star',
      ],
      reviewer: [
        '.a-profile-name',
        '[data-hook="genome-widget"] .a-profile-name',
      ],
      date: [
        '[data-hook="review-date"]',
      ],
      verified: [
        '[data-hook="avp-badge"]',
        '[data-hook="avp-badge-link"]',
        '[data-hook="review-badges"]',
        '.mrsp-avp-badge-linkless',
      ],
      helpful: [
        '[data-hook="helpful-vote-statement"]',
      ],
      profileLink: [
        'a.a-profile',
        '[data-hook="genome-widget"] a',
      ],
    }),

    [AMAZON_PAGE_TYPES.UNKNOWN]: Object.freeze({
      container: [
        '[data-hook="reviewContainer"]',
        'div[id^="customer_review-"]',
        'div[data-cel-widget^="customer_review-"]',
        '[data-hook="review"]',
      ],
      title: [
        '[data-hook="reviewTitle"]',
        '[data-hook="review-title"]',
        'h4[data-hook="reviewTitle"]',
      ],
      text: [
        '[data-hook="reviewText"]',
        '[data-hook="review-body"] span',
        '.review-text-content span',
      ],
      rating: [
        '[data-hook="review-star-rating"]',
        '[data-hook="cmps-review-star-rating"]',
        '.a-icon-star',
      ],
      reviewer: [
        '[data-hook="review-by-line"] .a-profile-name',
        '.a-profile-name',
        '[data-hook="genome-widget"] .a-profile-name',
      ],
      date: [
        '[data-hook="review-date"]',
      ],
      verified: [
        '[data-hook="avp-badge"]',
        '[data-hook="avp-badge-link"]',
        '[data-hook="review-badges"]',
        '.mrsp-avp-badge-linkless',
      ],
      helpful: [
        '[data-hook="helpful-vote-statement"]',
      ],
      profileLink: [
        'a.a-profile',
        '[data-hook="genome-widget"] a',
      ],
    }),
  }),

  GOOGLE_PLAY: Object.freeze({
    container: [
      '[jsmodel="PFDTne"]',
      '[data-review-id]',
    ],
    title: [],
    text: [
      '[jsname="fbQN7e"]',
      '[class*="review-body"]',
    ],
    rating: [
      '[role="img"][aria-label]',
    ],
    reviewer: [
      '.X43Kjb',
      '[class*="reviewer-name"]',
    ],
    date: [
      '[class*="review-date"]',
      '.p2TkOb',
    ],
    verified: [],
    helpful: [],
    profileLink: [],
  }),
});

/** Legacy SELECTORS alias for backward compatibility. */
export const SELECTORS = SELECTOR_PROFILES;
