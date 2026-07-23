/**
 * @module storage/snapshotRepository
 * @description Promise-based CRUD operations for the 'snapshots' IndexedDB object store.
 * All public functions validate their inputs and propagate storage errors to the caller.
 */

import { openDatabase } from './db.js';
import { OBJECT_STORE_NAME } from './schema.js';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves a snapshot to IndexedDB (insert or overwrite by primary key 'id').
 *
 * @param {Object} snapshot - Must include a non-empty string `id`.
 * @returns {Promise<void>}
 */
export async function saveSnapshot(snapshot) {
  assertValidSnapshot(snapshot);
  await executeRequest('readwrite', (store) => store.put(snapshot));
  console.debug(`[SnapshotRepository] Saved snapshot id: "${snapshot.id}"`);
}

/**
 * Retrieves a single snapshot by primary key.
 *
 * @param {string} id
 * @returns {Promise<Object|null>} The snapshot, or null if not found.
 */
export async function getSnapshot(id) {
  assertValidId(id, 'getSnapshot');
  const result = await executeRequest('readonly', (store) => store.get(id));
  return result ?? null;
}

/**
 * Retrieves all stored snapshots.
 *
 * @returns {Promise<Object[]>}
 */
export async function getAllSnapshots() {
  const results = await executeRequest('readonly', (store) => store.getAll());
  return results ?? [];
}

/**
 * Deletes a snapshot by primary key.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteSnapshot(id) {
  assertValidId(id, 'deleteSnapshot');
  await executeRequest('readwrite', (store) => store.delete(id));
  console.debug(`[SnapshotRepository] Deleted snapshot id: "${id}"`);
}

/**
 * Removes all snapshots from the object store.
 *
 * @returns {Promise<void>}
 */
export async function clearSnapshots() {
  await executeRequest('readwrite', (store) => store.clear());
  console.debug('[SnapshotRepository] Cleared all snapshots.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wraps an IDBRequest inside a transaction and returns a Promise.
 * Rejects on transaction error, transaction abort, or request error.
 *
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} requestFn
 * @returns {Promise<any>}
 */
async function executeRequest(mode, requestFn) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    let transaction;

    try {
      transaction = db.transaction(OBJECT_STORE_NAME, mode);
    } catch (err) {
      reject(new Error(`[SnapshotRepository] Could not open transaction: ${err.message}`));
      return;
    }

    transaction.onerror = () =>
      reject(new Error(`[SnapshotRepository] Transaction failed: ${transaction.error?.message ?? 'unknown'}`));

    transaction.onabort = () =>
      reject(new Error('[SnapshotRepository] Transaction aborted.'));

    try {
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = requestFn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror  = () =>
        reject(new Error(`[SnapshotRepository] Request failed: ${request.error?.message ?? 'unknown'}`));
    } catch (err) {
      reject(new Error(`[SnapshotRepository] Request execution error: ${err.message}`));
    }
  });
}

/**
 * Throws if the snapshot object is missing or lacks a valid string `id`.
 *
 * @param {any} snapshot
 */
function assertValidSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('[SnapshotRepository] saveSnapshot: expected a snapshot object.');
  }
  if (!snapshot.id || typeof snapshot.id !== 'string') {
    throw new Error('[SnapshotRepository] saveSnapshot: snapshot.id must be a non-empty string.');
  }
}

/**
 * Throws if `id` is not a non-empty string.
 *
 * @param {any} id
 * @param {string} callerName - Used in the error message for clarity.
 */
function assertValidId(id, callerName) {
  if (!id || typeof id !== 'string') {
    throw new Error(`[SnapshotRepository] ${callerName}: id must be a non-empty string.`);
  }
}
