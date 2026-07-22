/**
 * @module content/pagination
 * @description Handles automatic pagination through review pages.
 *
 * Amazon and Google Play both paginate reviews. To analyze a product's full
 * review set, the extension must either:
 *   a) Automatically click "Next Page" and wait for the DOM to update, or
 *   b) Detect the current page and signal to the user that only N reviews
 *      were analyzed.
 *
 * Phase 1 strategy: Detect pagination state (current page, total pages, next
 * button presence). Do NOT auto-click — let the user navigate and trigger
 * re-extraction naturally via MutationObserver.
 *
 * WHY not auto-click in Phase 1:
 * - Auto-clicking navigation is aggressive and could break page state.
 * - It requires careful timing (wait for load after each click).
 * - This is deferred to Phase 2 where it can be implemented as an opt-in feature.
 */

import { PLATFORMS } from '../utils/constants.js';
import { qs, extractText } from '../utils/helpers.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} PaginationState
 * @property {number|null} currentPage - Current page number (1-indexed), null if unknown.
 * @property {number|null} totalPages  - Total number of pages, null if unknown.
 * @property {boolean}     hasNext     - True if a "next page" button exists.
 * @property {boolean}     hasPrev     - True if a "previous page" button exists.
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reads the current pagination state from the DOM for the given platform.
 *
 * @param {string} platform - PLATFORMS constant.
 * @returns {PaginationState}
 */
export function getPaginationState(platform) {
  try {
    switch (platform) {
      case PLATFORMS.AMAZON:      return getAmazonPaginationState();
      case PLATFORMS.GOOGLE_PLAY: return getGooglePlayPaginationState();
      default:                    return buildUnknownState();
    }
  } catch (err) {
    console.warn('[Pagination] Failed to read pagination state:', err);
    return buildUnknownState();
  }
}

// ─── Amazon Pagination ────────────────────────────────────────────────────────

/**
 * @returns {PaginationState}
 */
function getAmazonPaginationState() {
  const nextBtn   = qs('.a-pagination .a-last:not(.a-disabled) a');
  const prevBtn   = qs('.a-pagination .a-first:not(.a-disabled) a');
  const pageItems = Array.from(document.querySelectorAll('.a-pagination li'))
    .map(li => li.textContent.trim())
    .filter(t => /^\d+$/.test(t))
    .map(Number);

  const currentEl = qs('.a-pagination .a-selected');
  const current   = currentEl ? parseInt(extractText(currentEl), 10) : null;
  const total     = pageItems.length > 0 ? Math.max(...pageItems) : null;

  return {
    currentPage: isNaN(current) ? null : current,
    totalPages:  total,
    hasNext:     Boolean(nextBtn),
    hasPrev:     Boolean(prevBtn),
  };
}

// ─── Google Play Pagination ───────────────────────────────────────────────────

/**
 * Google Play uses infinite scroll rather than numbered pages.
 * We detect the "show more" button to indicate more reviews exist.
 *
 * @returns {PaginationState}
 */
function getGooglePlayPaginationState() {
  const showMoreBtn = qs('[jsname="QEDhLb"], button[aria-label*="more review" i]');

  return {
    currentPage: null,
    totalPages:  null,
    hasNext:     Boolean(showMoreBtn),
    hasPrev:     false,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * @returns {PaginationState}
 */
function buildUnknownState() {
  return {
    currentPage: null,
    totalPages:  null,
    hasNext:     false,
    hasPrev:     false,
  };
}
