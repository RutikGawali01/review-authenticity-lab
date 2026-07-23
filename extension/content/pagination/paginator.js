/**
 * @module content/pagination/paginator
 * @description Single-pass pagination and DOM-based review extraction for Amazon pages:
 *   - getProductReviewPageUrl: Discovers "See all reviews" transition link from Product Pages (/dp/).
 *   - findShowMoreButton: Locates the visible "Show 10 more reviews" button on Review Pages.
 *   - waitForNewContainers: Deterministically waits for DOM review containers to increase using MutationObserver.
 *   - paginateReviewPage: Performs DOM-based AJAX pagination on Review Pages.
 *   - getNextPageUrl: Route dispatcher for page navigation links.
 */

import { AMAZON_PAGE_TYPES, MAX_REVIEWS } from '../../utils/constants.js';
import { extractReviews, findReviewContainers, resolveProfile } from '../extractor/reviewExtractor.js';
import { mergeReviews } from '../../utils/mergeReviews.js';
import { detectPlatform } from '../../utils/helpers.js';

/** Selectors for "See all reviews" transition link on Product Detail Pages (/dp/). */
const PRODUCT_SEE_ALL_SELECTORS = [
  'a[href*="/portal/customer-reviews/"]',
  'a[href*="/product-reviews/"]',
  'a[data-hook="see-all-reviews-link-foot"][href]',
  'a[data-hook="see-all-reviews-link-summary"][href]',
  '#reviews-medley-footer a[href*="/product-reviews/"]',
];

/** Selectors for "Show 10 more reviews" button on Review Pages. */
const SHOW_MORE_BUTTON_SELECTORS = [
  'a[data-hook="show-more-button"]',
  'a#cm_cr-pagination_header_next_page',
  'li.a-last:not(.a-disabled) a',
  '.a-pagination .a-last:not(.a-disabled) a',
];

/**
 * Discovers the "See all reviews" URL from an Amazon Product Page (/dp/).
 *
 * @param {ParentNode} [root=document]
 * @param {string} [baseUrl]
 * @returns {string|null} Absolute URL string, or null if missing.
 */
export function getProductReviewPageUrl(
  root = typeof document !== 'undefined' ? document : null,
  baseUrl = typeof window !== 'undefined' ? window.location?.href : ''
) {
  if (!root || typeof root.querySelector !== 'function') return null;

  for (let i = 0; i < PRODUCT_SEE_ALL_SELECTORS.length; i++) {
    try {
      const el = root.querySelector(PRODUCT_SEE_ALL_SELECTORS[i]);
      const href = el?.getAttribute('href') || el?.href;
      if (href && href.trim().length > 0 && !href.startsWith('javascript:')) {
        const url = resolveAbsoluteUrl(href.trim(), baseUrl);
        console.log(`[Paginator] Review page transition URL found: ${url}`);
        return url;
      }
    } catch {
      // Ignore query errors
    }
  }

  console.log('[Paginator] No "See all reviews" link found on product page.');
  return null;
}

/**
 * Locates the visible, enabled "Show 10 more reviews" button on Review Pages.
 *
 * @param {ParentNode} [root=document]
 * @returns {Element|null} The clickable button element, or null if missing.
 */
export function findShowMoreButton(root = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof root.querySelector !== 'function') return null;

  for (let i = 0; i < SHOW_MORE_BUTTON_SELECTORS.length; i++) {
    try {
      const candidates = root.querySelectorAll(SHOW_MORE_BUTTON_SELECTORS[i]);
      for (let j = 0; j < candidates.length; j++) {
        const el = candidates[j];
        if (!el || isElementHidden(el)) continue;
        if (el.closest('.a-disabled') || el.hasAttribute('disabled')) continue;

        console.log(`[Paginator] Found show-more button with selector: "${SHOW_MORE_BUTTON_SELECTORS[i]}"`);
        return el;
      }
    } catch {
      // Ignore query errors
    }
  }

  console.log('[Paginator] No visible show-more button found.');
  return null;
}

/**
 * Deterministically waits until review container count in DOM increases beyond previousCount.
 * Uses MutationObserver with a fallback timeout.
 *
 * @param {ParentNode} [root=document]
 * @param {string[]} [containerSelectors=[]]
 * @param {number} [previousCount=0]
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<number>} Final review container count in DOM.
 */
export function waitForNewContainers(
  root = typeof document !== 'undefined' ? document : null,
  containerSelectors = [],
  previousCount = 0,
  timeoutMs = 5000
) {
  return new Promise((resolve) => {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return resolve(previousCount);
    }

    const checkCount = () => {
      const { containers } = findReviewContainers(root, containerSelectors);
      return containers.length;
    };

    const currentCount = checkCount();
    if (currentCount > previousCount) {
      return resolve(currentCount);
    }

    let timer = null;
    let observer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
    };

    timer = setTimeout(() => {
      cleanup();
      resolve(checkCount());
    }, timeoutMs);

    if (typeof MutationObserver !== 'undefined') {
      const targetNode = root.body || root;
      observer = new MutationObserver(() => {
        const count = checkCount();
        if (count > previousCount) {
          cleanup();
          resolve(count);
        }
      });
      observer.observe(targetNode, { childList: true, subtree: true });
    }
  });
}

/**
 * Performs DOM-based pagination on Amazon Review Pages.
 * Programmatically clicks "Show 10 more reviews", waits for DOM updates, and merges new reviews.
 *
 * @param {ParentNode} [root=document]
 * @param {number} [maxReviews=MAX_REVIEWS]
 * @returns {Promise<Object>} Object containing accumulated reviews and execution details.
 */
export async function paginateReviewPage(
  root = typeof document !== 'undefined' ? document : null,
  maxReviews = MAX_REVIEWS
) {
  if (!root) return { success: false, reviews: [], reviewCount: 0, pagesProcessed: 0 };

  const currentUrl = typeof window !== 'undefined' ? window.location?.href || '' : '';
  const platform = detectPlatform(currentUrl);
  const { profile } = resolveProfile(platform, currentUrl);
  const containerSelectors = profile?.container || [];

  console.log('[Paginator] Starting Amazon Review Page DOM pagination...');

  const initialResult = extractReviews(root);
  if (!initialResult || !initialResult.success) {
    console.warn('[Paginator] Initial extraction failed with error.');
    return { success: false, reviews: [], reviewCount: 0, pagesProcessed: 0 };
  }

  let accumulatedReviews = initialResult.reviews || [];
  let iteration = 1;
  let newlyExtracted = accumulatedReviews.length;
  let totalUnique = accumulatedReviews.length;

  console.log(`[Pagination] Iteration: ${iteration}`);
  console.log(`[Pagination] Newly extracted: ${newlyExtracted}`);
  console.log(`[Pagination] Total unique reviews: ${totalUnique}`);

  if (totalUnique >= maxReviews) {
    console.log(`[Pagination] Maximum review limit (${maxReviews}) reached. Stopping extraction.`);
  } else {
    console.log('[Pagination] Continuing...');
  }

  while (accumulatedReviews.length < maxReviews) {
    const showMoreButton = findShowMoreButton(root);
    if (!showMoreButton) {
      console.log('[Pagination] "Show 10 more reviews" button is no longer available. Stopping extraction.');
      break;
    }

    const { containers } = findReviewContainers(root, containerSelectors);
    const previousContainerCount = containers.length;

    showMoreButton.click();

    const newContainerCount = await waitForNewContainers(root, containerSelectors, previousContainerCount, 5000);
    if (newContainerCount <= previousContainerCount) {
      console.log('[Pagination] No new reviews appended after a bounded wait. Stopping extraction.');
      break;
    }

    const nextResult = extractReviews(root);
    if (!nextResult || !nextResult.success) {
      console.error('[Pagination] Unexpected extraction error occurred. Stopping extraction.');
      break;
    }

    const countBefore = accumulatedReviews.length;
    accumulatedReviews = mergeReviews(accumulatedReviews, nextResult.reviews || []);
    const countAfter = accumulatedReviews.length;

    iteration++;
    newlyExtracted = countAfter - countBefore;
    totalUnique = countAfter;

    console.log(`[Pagination] Iteration: ${iteration}`);
    console.log(`[Pagination] Newly extracted: ${newlyExtracted}`);
    console.log(`[Pagination] Total unique reviews: ${totalUnique}`);

    if (totalUnique >= maxReviews) {
      console.log(`[Pagination] Maximum review limit (${maxReviews}) reached. Stopping extraction.`);
      break;
    }

    if (newlyExtracted === 0) {
      console.log('[Pagination] No new reviews appended after extraction. Stopping extraction.');
      break;
    }

    console.log('[Pagination] Continuing...');
  }

  if (accumulatedReviews.length > maxReviews) {
    accumulatedReviews = accumulatedReviews.slice(0, maxReviews);
  }

  console.log(`[Paginator] DOM pagination complete. Extracted ${accumulatedReviews.length} total unique reviews across ${iteration} iterations.`);

  return {
    success: true,
    reviews: accumulatedReviews,
    reviewCount: accumulatedReviews.length,
    pagesProcessed: iteration,
    profileName: initialResult.selectorProfile || 'AMAZON.REVIEWS_PAGE',
  };
}

/**
 * Route dispatcher for page transition links.
 *
 * @param {ParentNode} root
 * @param {string} pageType - AMAZON_PAGE_TYPES constant.
 * @param {string} baseUrl
 * @returns {string|null} Transition URL string for Product Page, or null for Review Page.
 */
export function getNextPageUrl(
  root = typeof document !== 'undefined' ? document : null,
  pageType = AMAZON_PAGE_TYPES.UNKNOWN,
  baseUrl = ''
) {
  if (pageType === AMAZON_PAGE_TYPES.PRODUCT_PAGE) {
    console.log('[Paginator] Detected Product Page: returning transition link URL');
    return getProductReviewPageUrl(root, baseUrl);
  }

  console.log('[Paginator] Detected Reviews Page: uses DOM pagination (no transition URL)');
  return null;
}

// Compatibility Export
export { getProductReviewPageUrl as getSeeAllReviewsUrl };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks if an element is hidden in the DOM.
 */
function isElementHidden(el) {
  if (!el) return true;
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return true;
      }
    } catch {
      // Fall through
    }
  }
  return false;
}

/**
 * Resolves relative or absolute URL string against base URL.
 */
function resolveAbsoluteUrl(href, baseUrl) {
  if (!href) return null;
  try {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.href : 'https://www.amazon.com');
    return new URL(href, base).href;
  } catch {
    if (href.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${href}`;
    }
    return href;
  }
}
