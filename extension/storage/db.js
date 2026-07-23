/**
 * @module storage/db
 * @description Opens and caches the IndexedDB connection. Creates the 'snapshots'
 * object store on first install. Exposes a reset helper for test teardown.
 */

import { DATABASE_NAME, DATABASE_VERSION, OBJECT_STORE_NAME } from './schema.js';

/** @type {Promise<IDBDatabase>|null} Cached singleton connection promise. */
let dbPromise = null;

/**
 * Returns the cached IndexedDB connection, opening it on first call.
 * The promise is reset on rejection or external version change so that
 * a subsequent call will attempt a fresh open rather than re-using a
 * failed promise.
 *
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  if (dbPromise) return dbPromise;

  // Guard before assigning to dbPromise so a rejected promise is never cached.
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('[DB] IndexedDB API is not available in this environment.'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
        console.debug(`[DB] Created object store: "${OBJECT_STORE_NAME}"`);
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      // If another tab upgrades the database, release this connection gracefully.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        console.warn('[DB] Connection closed — external version change detected.');
      };

      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null; // Allow retry on next call.
      reject(new Error(`[DB] Failed to open database: ${request.error?.message ?? 'unknown error'}`));
    };
  });

  return dbPromise;
}

/**
 * Resets the cached connection promise.
 * Intended for use in tests or after a controlled teardown.
 */
export function resetDatabaseConnection() {
  dbPromise = null;
}
