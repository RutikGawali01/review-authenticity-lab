console.log("BACKGROUND START");



/**
 * @module background/background
 * @description Central message router and background orchestrator for Review Authenticity Lab.
 * Manages the NavigationPaginator loop: tab navigations via chrome.tabs.update, visitedUrl Set loop protection,
 * deduplicated review merging, and structured diagnostic logging.
 */

import { MSG, PLATFORMS, ANALYSIS_STATUS, LIMITS, MAX_REVIEWS, STORAGE_KEYS } from '../utils/constants.js';
import { detectPlatform } from '../utils/helpers.js';
import { mergeReviews } from '../utils/mergeReviews.js';
import { analyzeReviews } from '../analysis/pipeline/reviewAnalysisPipeline.js';
// import { generateSummary } from '../analysis/summary/index.js';
import { generateSummary } from '../analysis/summary/generateSummary.js';

console.log('[Background] Service worker initialized.');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated. Reason:', details.reason);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message?.type, 'from:', sender.tab ? `Tab ${sender.tab.id}` : 'Popup/UI');

  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((err) => {
      console.error('[Background] Message handling error:', err);
      sendResponse({ success: false, error: err.message || 'Internal background error.' });
    });

  return true; // Keep message channel open for async response
});

/**
 * Routes incoming typed messages to dedicated handlers.
 */
async function handleMessage(message, sender) {
  if (!message || typeof message !== 'object' || !message.type) {
    return { success: false, error: 'Invalid message format: missing "type" field.' };
  }

  switch (message.type) {
    case MSG.PING:
      return { success: true, payload: { status: 'PONG' } };

    case MSG.GET_PAGE_STATUS:
      return handleGetPageStatus();

    case MSG.ANALYSIS_START:
      return handleAnalysisStart();

    case MSG.OPEN_SIDE_PANEL:
      return handleOpenSidePanel(sender);

    default:
      console.warn('[Background] Unhandled message type:', message.type);
      return { success: false, error: `Unhandled message type: ${message.type}` };
  }
}

/**
 * Gets the current page status, detected platform, and tab context.
 */
async function handleGetPageStatus() {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.url) {
    return { success: false, error: 'No active browser tab found.' };
  }

  const platform = detectPlatform(activeTab.url);

  let analysisState = ANALYSIS_STATUS.IDLE;
  let lastResult = null;

  try {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.ANALYSIS_STATE]);
    const storedData = stored[STORAGE_KEYS.ANALYSIS_STATE];

    if (storedData) {
      if (typeof storedData === 'string') {
        analysisState = storedData;
      } else if (storedData.reviews && Array.isArray(storedData.reviews)) {
        analysisState = ANALYSIS_STATUS.COMPLETE;
        lastResult = {
          product: {
            title: storedData.pageTitle ?? activeTab.title ?? '',
            url: storedData.url ?? activeTab.url ?? '',
            platform,
            image: '',
            price: '',
          },
          reviews: storedData.reviews,
        };
      }
    }
  } catch (err) {
    console.warn('[Background] Error reading stored analysis state:', err);
  }

  return {
    success: true,
    payload: {
      platform,
      analysisState,
      lastResult,
      context: {
        url: activeTab.url,
        productTitle: activeTab.title || '',
        tabId: activeTab.id,
      },
    },
  };
}

/**
 * Coordinates multi-page review extraction across tab navigations (NavigationPaginator).
 * Manages accumulatedReviews, pagesProcessed, and visitedUrls loop protection.
 */
async function handleAnalysisStart() {
  console.log('[Background] Received ANALYSIS_START request.');
  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id || !activeTab.url) {
    return { success: false, error: 'No active tab available for review analysis.' };
  }

  const platform = detectPlatform(activeTab.url);
  if (platform === PLATFORMS.UNKNOWN) {
    return { success: false, error: 'Current page is not a supported review platform (Amazon or Google Play required).' };
  }

  const maxPages = LIMITS.MAX_PAGINATION_PAGES || 30;
  const maxReviews = LIMITS.MAX_PAGINATION_REVIEWS || MAX_REVIEWS;

  let accumulatedReviews = [];
  let pagesProcessed = 0;
  const visitedUrls = new Set();
  let currentTabId = activeTab.id;
  let targetUrl = activeTab.url;

  try {
    while (targetUrl && pagesProcessed < maxPages && accumulatedReviews.length < maxReviews) {
      if (visitedUrls.has(targetUrl)) {
        console.warn(`[Background] Stopping pagination: URL already visited (${targetUrl}).`);
        break;
      }
      visitedUrls.add(targetUrl);

      pagesProcessed++;

      if (pagesProcessed > 1) {
        console.log(`[Background] Navigating to page ${pagesProcessed}`);
        await navigateTabAndWait(currentTabId, targetUrl);
        console.log('[Background] Navigation complete');
      } else {
        console.log(`[Background] Navigating to page 1`);
        console.log('[Background] Navigation complete');
      }

      console.log('[Background] Waiting for content script');
      const isReady = await waitForContentReady(currentTabId);
      if (!isReady) {
        console.warn(`[Background] Content script not ready on page ${pagesProcessed}. Returning partial results.`);
        break;
      }

      console.log('[Background] Starting extraction');
      const contentResponse = await sendTabMessage(currentTabId, {
        type: MSG.EXTRACT_REVIEWS,
        maxReviews,
        visitedUrls: Array.from(visitedUrls),
      });

      if (!contentResponse || !contentResponse.success) {
        const errMsg = contentResponse?.error || 'Content script failed to extract reviews.';
        console.warn(`[Background] Extraction warning on page ${pagesProcessed}: ${errMsg}`);
        break;
      }

      if (contentResponse.url && targetUrl) {
        verifyCurrentUrl(targetUrl, contentResponse.url);
      }

      const pageReviews = contentResponse.reviews || [];
      console.log(`[Background] ${pageReviews.length} reviews extracted`);

      if (pageReviews.length === 0) {
        console.warn(`[Background] Extraction returned zero reviews after retries on page ${pagesProcessed}. Returning partial results.`);
        break;
      }

      const countBefore = accumulatedReviews.length;
      accumulatedReviews = mergeReviews(accumulatedReviews, pageReviews);
      const countAfter = accumulatedReviews.length;

      console.log(`[Background] Merged ${countAfter - countBefore} new reviews`);
      console.log(`[Background] Total Reviews: ${accumulatedReviews.length}`);

      const nextPageUrl = contentResponse.nextPageUrl;

      if (!nextPageUrl) {
        console.log('[Background] No nextPageUrl returned. Pagination complete.');
        break;
      }

      if (visitedUrls.has(nextPageUrl)) {
        console.log(`[Background] Next page URL already visited: ${nextPageUrl}. Stopping pagination.`);
        break;
      }

      if (pagesProcessed >= maxPages || accumulatedReviews.length >= maxReviews) {
        console.log(`[Background] Limit reached (Pages: ${pagesProcessed}/${maxPages}, Reviews: ${accumulatedReviews.length}/${maxReviews}). Stopping pagination.`);
        break;
      }

      targetUrl = nextPageUrl;
    }

    if (accumulatedReviews.length > maxReviews) {
      accumulatedReviews = accumulatedReviews.slice(0, maxReviews);
    }

    console.log(`[Background] Pagination completed. Total pages: ${pagesProcessed}, Total merged reviews: ${accumulatedReviews.length}.`);
    console.log('[Background] Extraction completed');

    // 2. Execute analysis pipeline across extracted reviews
    const analyzedReviews = await analyzeReviews(accumulatedReviews);

    // 3. Generate summary report
    const summary = generateSummary(analyzedReviews);
    console.log('[Background] Summary generated');

    // 4. Save final analysis result to chrome.storage.local
    const analysisResult = {
      reviews: analyzedReviews,
      summary,
      url: activeTab.url,
      pageTitle: activeTab.title,
      timestamp: Date.now(),
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.ANALYSIS_STATE]: analysisResult });
    console.log('[Background] Analysis saved');

    return {
      success: true,
      payload: {
        status: ANALYSIS_STATUS.COMPLETE,
        reviewsCount: analyzedReviews.length,
        pagesProcessed,
        reviews: analyzedReviews,
        summary,
        url: activeTab.url,
        pageTitle: activeTab.title,
      },
    };
  } catch (err) {
    console.error('[Background] Multi-page navigation error:', err.message);
    return {
      success: accumulatedReviews.length > 0,
      payload: accumulatedReviews.length > 0 ? {
        status: ANALYSIS_STATUS.COMPLETE,
        reviewsCount: accumulatedReviews.length,
        pagesProcessed,
        reviews: accumulatedReviews,
        url: activeTab.url,
        pageTitle: activeTab.title,
      } : undefined,
      error: accumulatedReviews.length === 0 ? 'Failed to complete review extraction.' : undefined,
    };
  }
}

/**
 * Opens the extension side panel for the current window.
 */
async function handleOpenSidePanel(sender) {
  try {
    const activeTab = await getActiveTab();
    if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function' && activeTab?.windowId) {
      await chrome.sidePanel.open({ windowId: activeTab.windowId });
      return { success: true };
    }
    return { success: false, error: 'Side Panel API is not supported or unavailable in this Chrome version.' };
  } catch (err) {
    console.error('[Background] Failed to open side panel:', err);
    return { success: false, error: err.message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Waits for content script readiness handshake (PING -> READY/PONG).
 */
async function waitForContentReady(tabId, maxRetries = 5, retryIntervalMs = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await sendTabMessage(tabId, { type: MSG.PING });
      if (response && response.success && (response.payload?.status === 'READY' || response.payload?.status === 'PONG')) {
        console.log('[Background] Content ready');
        return true;
      }
    } catch {
      // Content script not listening yet
    }

    if (attempt === 1) {
      await ensureContentScriptInjected(tabId);
    } else {
      await new Promise((r) => setTimeout(r, retryIntervalMs));
    }
  }

  console.warn('[Background] Timed out waiting for content script readiness');
  return false;
}

/**
 * Verifies current page URL matches expected URL and logs redirects.
 */
function verifyCurrentUrl(expectedUrl, actualUrl) {
  if (!expectedUrl || !actualUrl) return;
  const normalize = (u) => {
    try {
      const parsed = new URL(u);
      parsed.hash = '';
      let href = parsed.href.toLowerCase();
      if (href.endsWith('/')) href = href.slice(0, -1);
      return href;
    } catch {
      return u.trim().toLowerCase();
    }
  };

  if (normalize(expectedUrl) !== normalize(actualUrl)) {
    console.log(`[Background] Expected URL: ${expectedUrl}`);
    console.log(`[Background] Actual URL: ${actualUrl}`);
  }
}

/**
 * Ensures the content script is active and listening on the specified tab.
 * Programmatically injects `content/content.js` on-demand if PING fails.
 */
async function ensureContentScriptInjected(tabId) {
  try {
    const response = await sendTabMessage(tabId, { type: MSG.PING });
    if (response?.success && (response.payload?.status === 'READY' || response.payload?.status === 'PONG')) {
      return true;
    }
  } catch {
    // Content script not listening yet
  }

  console.log(`[Background] Programmatically executing content/content.js on tab ${tabId}...`);
  try {
    if (chrome.scripting && typeof chrome.scripting.executeScript === 'function') {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js'],
      });
    }
  } catch (err) {
    console.warn(`[Background] Programmatic injection warning on tab ${tabId}:`, err.message);
  }

  return waitForContentScriptPing(tabId, 3000, 150);
}

/**
 * Pings content script in a polling loop until PONG/READY is received or maxTimeoutMs expires.
 */
async function waitForContentScriptPing(tabId, maxTimeoutMs = 3000, pollIntervalMs = 150) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxTimeoutMs) {
    try {
      const response = await sendTabMessage(tabId, { type: MSG.PING });
      if (response && response.success && (response.payload?.status === 'READY' || response.payload?.status === 'PONG')) {
        return true;
      }
    } catch {
      // Content script not ready yet
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  return false;
}

/**
 * Navigates a tab to a new URL and waits for document_idle loading completion.
 */
function navigateTabAndWait(tabId, url) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.update) {
      reject(new Error('chrome.tabs.update API unavailable.'));
      return;
    }

    let timeoutTimer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeoutTimer);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    chrome.tabs.update(tabId, { url }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeoutTimer);
        reject(new Error(chrome.runtime.lastError.message));
      }
    });
  });
}

/**
 * Queries Chrome tabs API for the currently active tab in the focused window.
 */
function getActiveTab() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      resolve(null);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn('[Background] Error querying active tab:', chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(tabs && tabs.length > 0 ? tabs[0] : null);
      }
    });
  });
}

/**
 * Sends a message to a specific tab's content script safely wrapped in a promise.
 */
function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      reject(new Error('chrome.tabs.sendMessage API unavailable.'));
      return;
    }

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
