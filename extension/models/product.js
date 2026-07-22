/**
 * @module models/product
 * @description Factory for the Product model.
 * Centralizes product metadata to avoid duplication across snapshots and reviews.
 */

/**
 * @typedef {Object} Product
 * @property {string} id       - Unique identifier (e.g., ASIN or app package).
 * @property {string} platform - 'amazon' or 'google_play'.
 * @property {string} url      - Canonical product URL.
 * @property {string} title    - Product display name.
 */

/**
 * Creates and validates a frozen Product object.
 *
 * @param {Object} raw
 * @returns {Product|null} Frozen Product object, or null if validation fails.
 */
export function createProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id || !raw.platform) return null;

  return Object.freeze({
    id: String(raw.id).trim(),
    platform: String(raw.platform).trim(),
    url: raw.url ? String(raw.url).trim() : '',
    title: raw.title ? String(raw.title).trim() : '',
  });
}
