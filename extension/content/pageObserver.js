/**
 * @module content/pageObserver
 * @description MutationObserver wrapper for detecting dynamic DOM changes.
 *
 * Amazon and Google Play both use JavaScript-driven pagination that replaces
 * review cards in-place without a full page navigation. This module watches
 * for meaningful DOM changes (new review cards appearing) and notifies the
 * content coordinator via a callback, debounced to avoid flooding.
 *
 * WHY MutationObserver + debounce:
 * - Single Page App pagination does not trigger DOMContentLoaded.
 * - A raw MutationObserver fires hundreds of times per second during renders.
 * - Debouncing collapses those into one notification after the DOM settles.
 */

import { TIMINGS }  from '../utils/constants.js';
import { debounce } from '../utils/helpers.js';

// ─── Module State ─────────────────────────────────────────────────────────────

/** @type {MutationObserver|null} */
let _observer = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts observing the document body for meaningful review DOM changes.
 * Calls `onChanged` (debounced) when a change is detected.
 *
 * Safe to call multiple times — stops any existing observer first.
 *
 * @param {() => void} onChanged - Callback invoked when reviews may have changed.
 * @returns {void}
 */
export function startObserving(onChanged) {
  stopObserving();

  if (typeof onChanged !== 'function') {
    console.warn('[PageObserver] onChanged must be a function.');
    return;
  }

  const debouncedCallback = debounce(onChanged, TIMINGS.OBSERVER_DEBOUNCE_MS);

  _observer = new MutationObserver((mutations) => {
    if (hasMeaningfulChange(mutations)) {
      console.debug('[PageObserver] Meaningful DOM change detected.');
      debouncedCallback();
    }
  });

  _observer.observe(document.body, {
    childList:  true,
    subtree:    true,
    attributes: false, // attribute changes are too noisy
    characterData: false,
  });

  console.debug('[PageObserver] Observer started.');
}

/**
 * Stops the active MutationObserver. Idempotent.
 *
 * @returns {void}
 */
export function stopObserving() {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
    console.debug('[PageObserver] Observer stopped.');
  }
}

/**
 * Returns true if the observer is currently active.
 *
 * @returns {boolean}
 */
export function isObserving() {
  return _observer !== null;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Filters mutation records to only those that represent review cards
 * being added or removed — not style or attribute churn from animations.
 *
 * @param {MutationRecord[]} mutations
 * @returns {boolean}
 */
function hasMeaningfulChange(mutations) {
  for (const mutation of mutations) {
    if (mutation.type !== 'childList') continue;
    if (!mutation.addedNodes.length && !mutation.removedNodes.length) continue;

    for (const node of mutation.addedNodes) {
      if (isReviewRelatedNode(node)) return true;
    }
  }

  return false;
}

/**
 * Heuristically determines if an added DOM node is a review card or a container
 * likely to hold review cards. Avoids false positives from ad/navigation mutations.
 *
 * @param {Node} node
 * @returns {boolean}
 */
function isReviewRelatedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;

  const el = /** @type {Element} */ (node);

  // Amazon
  if (el.hasAttribute('data-hook') && el.getAttribute('data-hook').includes('review')) return true;
  if (el.querySelector?.('[data-hook="review"]')) return true;

  // Google Play
  if (el.hasAttribute('data-review-id')) return true;
  if (el.querySelector?.('[data-review-id]')) return true;

  // Generic: large block-level additions are likely content changes
  if (['SECTION', 'ARTICLE', 'DIV'].includes(el.tagName) && el.children.length > 3) return true;

  return false;
}
