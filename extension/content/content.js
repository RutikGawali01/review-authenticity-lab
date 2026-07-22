/**
 * @module content/content
 * @description Content script injected on supported product review pages.
 * Verifies injection, tests DOM access, and logs meaningful status messages.
 */

(function initializeContentScript() {
  const currentUrl = window.location.href;
  const pageTitle = document.title;
  const bodyElement = document.body;

  console.log('[Content Script] Injected successfully into page:', currentUrl);

  // Verify DOM access
  if (bodyElement) {
    console.log('[Content Script] DOM access verified. Page Title:', pageTitle);
    console.log('[Content Script] Document body child elements count:', bodyElement.children.length);
  } else {
    console.warn('[Content Script] Document body not yet available.');
  }

  // Listen for messages from popup or background worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Content Script] Received message:', message);

    if (message.action === 'ANALYZE_REVIEWS') {
      console.log('[Content Script] Action "ANALYZE_REVIEWS" received. DOM is ready for scanning.');
      
      // Respond to caller confirming DOM readiness
      sendResponse({
        success: true,
        status: 'DOM_READY',
        url: currentUrl,
        pageTitle: pageTitle
      });
    }

    return true; // Keep message channel open for async response
  });
})();
