/**
 * @module storage/indexedDb
 * @description Low-level IndexedDB abstraction providing a promise-based CRUD API.
 *
 * All IndexedDB interactions in the extension go through this module.
 * Higher-level modules (snapshots.js, labels.js) build on top of these primitives.
 *
 * WHY a centralized abstraction:
 * - IndexedDB's event-driven API is verbose and error-prone. Wrapping it in
 *   async/await dramatically reduces boilerplate and surface area for bugs.
 * - Schema migrations are managed in one place, not scattered across callers.
 * - Singleton connection prevents redundant open() calls and version conflicts.
 */

import { DB } from '../utils/constants.js';

// ─── Singleton Connection ─────────────────────────────────────────────────────

/** @type {IDBDatabase|null} */
let _db = null;

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Opens (or returns the cached) IndexedDB connection.
 * Idempotent — safe to call multiple times.
 *
 * @returns {Promise<IDBDatabase>}
 */
export async function openDb() {
  if (_db) return _db;

  _db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB.NAME, DB.VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.debug('[IndexedDB] Connection established.');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.debug('[IndexedDB] Running schema upgrade to version', DB.VERSION);
      applySchema(event.target.result, event.oldVersion);
    };
  });

  _db.onerror = (event) => {
    console.error('[IndexedDB] Uncaught database error:', event.target.error);
  };

  return _db;
}

/**
 * Closes and clears the singleton connection.
 * Used for testing and controlled teardown.
 */
export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
    console.debug('[IndexedDB] Connection closed.');
  }
}

// ─── Schema Definitions ───────────────────────────────────────────────────────

/**
 * Applies schema changes based on the version being upgraded from.
 * New versions should add cases without modifying earlier ones.
 *
 * @param {IDBDatabase} db
 * @param {number} oldVersion - The previous schema version (0 if first install).
 */
function applySchema(db, oldVersion) {
  if (oldVersion < 1) {
    createSnapshotsStore(db);
    createLabelsStore(db);
  }
  // Future versions:
  // if (oldVersion < 2) { createAnalysisResultsStore(db); }
}

/**
 * Creates the 'snapshots' object store with indexes.
 *
 * @param {IDBDatabase} db
 */
function createSnapshotsStore(db) {
  const store = db.createObjectStore(DB.STORES.SNAPSHOTS, { keyPath: 'id' });
  store.createIndex('productId',    'productId',    { unique: false });
  store.createIndex('platform',     'platform',     { unique: false });
  store.createIndex('capturedAtMs', 'capturedAtMs', { unique: false });
  console.debug('[IndexedDB] Created store:', DB.STORES.SNAPSHOTS);
}

/**
 * Creates the 'labels' object store with indexes.
 *
 * @param {IDBDatabase} db
 */
function createLabelsStore(db) {
  const store = db.createObjectStore(DB.STORES.LABELS, { keyPath: 'id' });
  store.createIndex('reviewId',  'reviewId',  { unique: false });
  store.createIndex('productId', 'productId', { unique: false });
  console.debug('[IndexedDB] Created store:', DB.STORES.LABELS);
}

// ─── Generic CRUD Primitives ──────────────────────────────────────────────────

/**
 * Writes a single object to an object store.
 * Uses 'put' semantics — creates or overwrites.
 *
 * @param {string} storeName
 * @param {Object} record - Must have the store's keyPath field.
 * @returns {Promise<void>}
 */
export async function put(storeName, record) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readwrite', store => store.put(record));
}

/**
 * Retrieves a single object by its primary key.
 *
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<Object|undefined>}
 */
export async function get(storeName, key) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readonly', store => store.get(key));
}

/**
 * Retrieves all records from an object store.
 *
 * @param {string} storeName
 * @returns {Promise<Object[]>}
 */
export async function getAll(storeName) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readonly', store => store.getAll());
}

/**
 * Retrieves all records matching an index value.
 *
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey} value
 * @returns {Promise<Object[]>}
 */
export async function getAllByIndex(storeName, indexName, value) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readonly', store =>
    store.index(indexName).getAll(value)
  );
}

/**
 * Deletes a single record by its primary key.
 *
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function remove(storeName, key) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readwrite', store => store.delete(key));
}

/**
 * Deletes all records from a store. Used for reset/wipe operations.
 *
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readwrite', store => store.clear());
}

/**
 * Returns the count of records in a store.
 *
 * @param {string} storeName
 * @returns {Promise<number>}
 */
export async function count(storeName) {
  const db = await openDb();
  return runTransaction(db, storeName, 'readonly', store => store.count());
}

// ─── Transaction Helper ───────────────────────────────────────────────────────

/**
 * Executes a single IDBRequest inside a transaction and wraps it in a promise.
 *
 * @param {IDBDatabase}  db
 * @param {string}       storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} fn - Returns the IDBRequest to await.
 * @returns {Promise<any>}
 */
function runTransaction(db, storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    let transaction;

    try {
      transaction = db.transaction(storeName, mode);
    } catch (err) {
      reject(new Error(`[IndexedDB] Failed to open transaction on "${storeName}": ${err.message}`));
      return;
    }

    transaction.onerror = () => {
      reject(new Error(`[IndexedDB] Transaction error on "${storeName}": ${transaction.error?.message}`));
    };

    transaction.onabort = () => {
      reject(new Error(`[IndexedDB] Transaction aborted on "${storeName}".`));
    };

    const store   = transaction.objectStore(storeName);
    const request = fn(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror   = () => reject(new Error(`[IndexedDB] Request error: ${request.error?.message}`));
  });
}
