/**
 * @module helpers
 * @description Pure, stateless utility functions used across the entire extension.
 * No business logic. No side effects. No DOM access. No storage access.
 *
 * WHY: Centralizing small utilities prevents copy-paste duplication and makes
 * individual behaviors independently testable without a browser environment.
 */

import { SUPPORTED_SITES, PLATFORMS, AMAZON_PAGE_TYPES } from './constants.js';

// ─── Platform Detection ───────────────────────────────────────────────────────

/**
 * Detects the review platform from a given URL string.
 *
 * @param {string} url - The full URL to inspect.
 * @returns {string} A PLATFORMS constant value.
 */
export function detectPlatform(url) {
  if (!url || typeof url !== 'string') return PLATFORMS.UNKNOWN;

  for (const { pattern, platform } of SUPPORTED_SITES) {
    if (url.includes(pattern)) return platform;
  }

  return PLATFORMS.UNKNOWN;
}

/**
 * Detects the specific Amazon page layout type from a URL.
 *
 * @param {string} [url] - Full URL string or current window URL.
 * @returns {string} Value of AMAZON_PAGE_TYPES.
 */
export function detectAmazonPageType(url = typeof window !== 'undefined' ? window.location?.href : '') {
  if (!url || typeof url !== 'string') return AMAZON_PAGE_TYPES.UNKNOWN;

  const lowercaseUrl = url.toLowerCase();

  if (lowercaseUrl.includes('/dp/') || lowercaseUrl.includes('/gp/product/')) {
    return AMAZON_PAGE_TYPES.PRODUCT_PAGE;
  }

  if (lowercaseUrl.includes('/product-reviews/') || lowercaseUrl.includes('/portal/customer-reviews/')) {
    return AMAZON_PAGE_TYPES.REVIEWS_PAGE;
  }

  return AMAZON_PAGE_TYPES.UNKNOWN;
}

/**
 * Returns true if the given URL belongs to a supported review platform.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isSupportedPage(url) {
  return detectPlatform(url) !== PLATFORMS.UNKNOWN;
}

// ─── Text Processing ──────────────────────────────────────────────────────────

/**
 * Normalizes and sanitizes a raw text string extracted from the DOM.
 * Trims whitespace, collapses internal runs of whitespace, and removes
 * non-printable control characters.
 *
 * @param {string|null|undefined} raw
 * @returns {string} Clean, normalized string. Empty string on bad input.
 */
export function sanitizeText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[\x00-\x1F\x7F]/g, ' ') // remove control characters
    .replace(/\s+/g, ' ')              // collapse whitespace
    .trim();
}

/**
 * Truncates a string to a maximum byte-safe character count.
 * Used when storing review bodies to avoid exceeding IndexedDB limits.
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

/**
 * Returns the current UTC timestamp in milliseconds.
 * Centralized so it can be mocked in tests.
 *
 * @returns {number}
 */
export function nowMs() {
  return Date.now();
}

/**
 * Converts a UTC timestamp (ms) to an ISO 8601 date string.
 *
 * @param {number} timestampMs
 * @returns {string}
 */
export function toIsoDate(timestampMs) {
  return new Date(timestampMs).toISOString();
}

/**
 * Parses a human-readable date string from a product page into a UTC timestamp.
 * Returns null if the date cannot be parsed.
 *
 * @param {string} rawDate - e.g. "Reviewed in the United States on January 5, 2024"
 * @returns {number|null}
 */
export function parseDateToMs(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') return null;

  // Strip common Amazon prefix
  const cleaned = rawDate.replace(/^reviewed in .+ on /i, '').trim();
  const parsed = Date.parse(cleaned);

  return isNaN(parsed) ? null : parsed;
}

// ─── ID Generation ────────────────────────────────────────────────────────────

/**
 * Generates a lightweight, collision-resistant ID from a string input.
 * Uses a djb2-style hash — fast, deterministic, no crypto dependency needed
 * for non-security use cases like deduplication keys.
 *
 * @param {string} input
 * @returns {string} Hex string of 8 characters.
 */
export function hashString(input) {
  if (!input || typeof input !== 'string') return '00000000';

  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // keep as unsigned 32-bit
  }

  return hash.toString(16).padStart(8, '0');
}

/**
 * Generates a unique ID for a review by hashing its author + body.
 * Deterministic — same review always produces the same ID.
 *
 * @param {string} author
 * @param {string} body
 * @returns {string}
 */
export function generateReviewId(author, body) {
  const combined = `${sanitizeText(author)}::${sanitizeText(body)}`;
  return `rev_${hashString(combined)}`;
}

// ─── Async Utilities ──────────────────────────────────────────────────────────

/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Useful for introducing deliberate delays in async flows.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps a promise with a timeout. Rejects if the original promise does not
 * settle within `ms` milliseconds.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label] - Identifier for the error message.
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = 'operation') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Function Utilities ───────────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` that delays invocation until `wait` ms
 * after the last call. Prevents expensive operations from firing on every DOM
 * mutation or keypress.
 *
 * @template {(...args: any[]) => void} T
 * @param {T} fn
 * @param {number} wait - Milliseconds to wait after the last call.
 * @returns {T}
 */
export function debounce(fn, wait) {
  let timer = null;

  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ─── Array Utilities ──────────────────────────────────────────────────────────

/**
 * Groups an array of objects by the value of a given key.
 *
 * @template T
 * @param {T[]} items
 * @param {keyof T} key
 * @returns {Record<string, T[]>}
 */
export function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const group = String(item[key] ?? '__unknown__');
    (acc[group] ??= []).push(item);
    return acc;
  }, {});
}

/**
 * De-duplicates an array of objects by a derived string key.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} keyFn
 * @returns {T[]}
 */
export function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── DOM Utilities (non-side-effecting helpers only) ──────────────────────────

/**
 * Safely queries a single DOM element, returning null on any failure.
 * Avoids throwing when selectors are stale or invalid.
 *
 * @param {string} selector
 * @param {Element|Document} [root=document]
 * @returns {Element|null}
 */
export function qs(selector, root = document) {
  try {
    return root.querySelector(selector);
  } catch {
    console.warn(`[helpers] Invalid selector: "${selector}"`);
    return null;
  }
}

/**
 * Safely queries all matching DOM elements, returning an empty array on failure.
 *
 * @param {string} selector
 * @param {Element|Document} [root=document]
 * @returns {Element[]}
 */
export function qsa(selector, root = document) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    console.warn(`[helpers] Invalid selector: "${selector}"`);
    return [];
  }
}

/**
 * Extracts and sanitizes the text content of a DOM element.
 *
 * @param {Element|null} el
 * @returns {string}
 */
export function extractText(el) {
  return sanitizeText(el?.textContent ?? '');
}
