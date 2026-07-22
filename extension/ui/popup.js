/**
 * @module ui/popup
 * @description Controller for the extension popup window.
 * Listens for the "Analyze Reviews" button click and sends a trigger message.
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnAnalyze = document.getElementById('btn-analyze');
  const statusText = document.getElementById('status-text');

  if (!btnAnalyze) return;

  btnAnalyze.addEventListener('click', async () => {
    console.log('[Popup] "Analyze Reviews" button clicked.');

    if (statusText) {
      statusText.textContent = 'Analysis requested...';
      statusText.classList.remove('hidden');
    }

    try {
      // Query active tab to verify communication
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id) {
        if (statusText) statusText.textContent = 'No active tab found.';
        return;
      }

      // Send analysis start signal
      chrome.tabs.sendMessage(tab.id, { action: 'ANALYZE_REVIEWS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Popup] Message failed (content script may not be injected on this page):', chrome.runtime.lastError.message);
          if (statusText) statusText.textContent = 'Navigate to Amazon or Google Play to analyze.';
        } else {
          console.log('[Popup] Content script acknowledged message:', response);
          if (statusText) statusText.textContent = 'Analysis started!';
        }
      });
    } catch (err) {
      console.error('[Popup] Error triggering analysis:', err);
      if (statusText) statusText.textContent = 'Error starting analysis.';
    }
  });
});
