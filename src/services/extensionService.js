/**
 * @module services/extensionService
 * @description Isolates Chrome Extension API messaging logic from React components.
 * React views consume these async functions without calling chrome.runtime directly.
 */

import { MSG, STORAGE_KEYS } from '../../extension/utils/constants.js';

/**
 * Queries the background worker for the active page status and context.
 *
 * @returns {Promise<Object>}
 */
export async function getPageStatus() {
  return sendExtensionMessage({ type: MSG.GET_PAGE_STATUS });
}

/**
 * Sends a message to start analyzing the current tab's reviews.
 *
 * @returns {Promise<Object>}
 */
export async function startAnalysis() {
  return sendExtensionMessage({ type: MSG.ANALYSIS_START });
}

/**
 * Requests the background worker to open the extension side panel.
 *
 * @returns {Promise<Object>}
 */
export async function openSidePanel() {
  return sendExtensionMessage({ type: MSG.OPEN_SIDE_PANEL });
}

/**
 * Fetches a specific snapshot by ID.
 *
 * @param {string} snapshotId
 * @returns {Promise<Object>}
 */
export async function getSnapshot(snapshotId) {
  return sendExtensionMessage({ type: MSG.GET_SNAPSHOT, payload: { snapshotId } });
}

/**
 * Fetches the most recent snapshot for the active product.
 *
 * @returns {Promise<Object>}
 */
export async function getLatestSnapshot() {
  return sendExtensionMessage({ type: MSG.GET_LATEST_SNAPSHOT });
}

/**
 * Registers a listener for SNAPSHOT_READY background events.
 *
 * @param {(snapshotId: string) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function subscribeToSnapshotReady(callback) {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
    return () => {};
  }

  const listener = (message) => {
    if (message?.type === MSG.SNAPSHOT_READY && message.payload?.snapshotId) {
      callback(message.payload.snapshotId);
    }
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => {
    chrome.runtime.onMessage.removeListener(listener);
  };
}

/**
 * Loads stored analysisResult directly from chrome.storage.local.
 *
 * @returns {Promise<{ success: boolean, payload?: Object, error?: string }>}
 */
export async function getStoredAnalysisState() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve({ success: false, error: 'chrome.storage.local API unavailable.' });
      return;
    }

    chrome.storage.local.get([STORAGE_KEYS.ANALYSIS_STATE], (result) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        const state = result[STORAGE_KEYS.ANALYSIS_STATE];
        resolve({ success: true, payload: state || null });
      }
    });
  });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Sends a message via chrome.runtime.sendMessage safely wrapped in a promise.
 * Handles environments where chrome API is unavailable (e.g. standalone browser preview).
 *
 * @param {Object} message
 * @returns {Promise<Object>}
 */
function sendExtensionMessage(message) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      console.warn('[extensionService] chrome.runtime API unavailable. Returning mock response for:', message.type);
      resolve({ success: false, error: 'Extension API unavailable in standalone browser context.' });
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[extensionService] Messaging error:', chrome.runtime.lastError.message);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: 'Empty response received from background.' });
      }
    });
  });
}
