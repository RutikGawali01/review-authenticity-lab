import React, { useState, useEffect } from 'react';
import Header from '../../../src/components/Header.jsx';
import Button from '../../../src/components/Button.jsx';
import Loader from '../../../src/components/Loader.jsx';
import ErrorState from '../../../src/components/ErrorState.jsx';
import MetricCard from '../../../src/components/MetricCard.jsx';
import { getPageStatus, startAnalysis, openSidePanel } from '../../../src/services/extensionService.js';
import { createAndSaveSnapshot, loadSnapshots } from '../../../src/services/snapshotService.js';
import { ANALYSIS_STATUS, PLATFORMS, PLATFORM_LABELS } from '../../utils/constants.js';

export default function PopupApp() {
  const [status, setStatus] = useState(ANALYSIS_STATUS.IDLE);
  const [platform, setPlatform] = useState(PLATFORMS.UNKNOWN);
  const [productTitle, setProductTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Holds the last successful analysis result so the Save button can use it.
  const [lastResult, setLastResult] = useState(null);

  // Save Snapshot button state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null); // { type: 'success'|'error', text: string }

  useEffect(() => {
    let isMounted = true;

    fetchPageStatus(isMounted);
    fetchSavedSnapshots();

    return () => { isMounted = false; };
  }, []);

  const fetchPageStatus = async (isMounted = true) => {
    setLoading(true);
    setError(null);

    const response = await getPageStatus();
    if (!isMounted) return;

    if (response?.success && response.payload) {
      const { platform: plt, analysisState, context } = response.payload;
      setPlatform(plt ?? PLATFORMS.UNKNOWN);
      setStatus(analysisState ?? ANALYSIS_STATUS.IDLE);
      if (context?.productTitle) setProductTitle(context.productTitle);
    } else {
      setError(response?.error ?? 'Could not connect to extension background worker.');
    }
    setLoading(false);
  };

  /**
   * Loads saved snapshot metadata on popup startup.
   * Prints a summary to the console. Does not load reviews into memory.
   */
  const fetchSavedSnapshots = async () => {
    try {
      const snapshots = await loadSnapshots();
      console.log(`[PopupApp] Loaded ${snapshots.length} saved snapshot(s).`, snapshots);
    } catch (err) {
      console.error('[PopupApp] Failed to load snapshots:', err);
    }
  };

  const handleAnalyzeClick = async () => {
    setStatus(ANALYSIS_STATUS.EXTRACTING);
    setError(null);
    setLastResult(null);
    setSaveMessage(null);

    const response = await startAnalysis();

    if (response?.success) {
      setStatus(ANALYSIS_STATUS.COMPLETE);
      setLastResult(buildLastResult(response.payload, platform));
    } else {
      setStatus(ANALYSIS_STATUS.ERROR);
      setError(response?.error || 'Analysis execution failed.');
    }
  };

  const handleSaveClick = async () => {
    if (!lastResult || saving) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      await createAndSaveSnapshot(lastResult.product, lastResult.reviews);
      setSaveMessage({ type: 'success', text: 'Snapshot Saved' });
    } catch (err) {
      console.error('[PopupApp] Snapshot save failed:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPanelClick = async () => {
    await openSidePanel();
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    }
  };

  const isSupported = platform !== PLATFORMS.UNKNOWN;
  const isAnalyzing = status === ANALYSIS_STATUS.EXTRACTING || status === ANALYSIS_STATUS.ANALYZING;
  const showSaveButton = status === ANALYSIS_STATUS.COMPLETE && lastResult !== null;

  return (
    <div className="w-72 bg-slate-900 text-slate-100 p-4 font-sans antialiased min-h-[260px] flex flex-col justify-between border border-slate-800 rounded-xl shadow-2xl">
      <div>
        <Header 
          subtitle={productTitle || (isSupported ? 'Product page active' : undefined)}
          platform={isSupported ? (PLATFORM_LABELS[platform] || platform) : undefined}
        />

        {loading ? (
          <Loader text="Connecting to page..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPageStatus} />
        ) : !isSupported ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center space-y-2 my-2">
            <p className="text-xs text-slate-300 font-medium">
              Unsupported Page
            </p>
            <p className="text-[11px] text-slate-400 leading-normal">
              Navigate to an Amazon product or Google Play Store app page to analyze reviews.
            </p>
          </div>
        ) : isAnalyzing ? (
          <Loader text={status === ANALYSIS_STATUS.EXTRACTING ? 'Extracting DOM reviews...' : 'Analyzing patterns...'} />
        ) : (
          <div className="space-y-3 my-2">
            {/* Quick Metrics preview */}
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="Reviews" value={status === ANALYSIS_STATUS.COMPLETE ? 'Ready' : '—'} />
              <MetricCard label="Signals" value={status === ANALYSIS_STATUS.COMPLETE ? 'Ready' : '—'} />
              <MetricCard label="Risk" value={status === ANALYSIS_STATUS.COMPLETE ? 'OK' : '—'} />
            </div>
          </div>
        )}
      </div>

      {isSupported && !loading && (
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          <Button 
            onClick={handleAnalyzeClick} 
            disabled={isAnalyzing}
            variant="primary"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Reviews'}
          </Button>

          {showSaveButton && (
            <Button
              onClick={handleSaveClick}
              disabled={saving}
              variant="secondary"
            >
              {saving ? 'Saving...' : 'Save Snapshot'}
            </Button>
          )}

          {saveMessage && (
            <p className={`text-[11px] text-center font-medium ${
              saveMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {saveMessage.text}
            </p>
          )}

          <Button 
            onClick={handleOpenPanelClick} 
            variant="secondary"
          >
            Open Side Panel Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the product + reviews data from a successful background analysis payload
 * and maps it to the shape expected by snapshotService.
 *
 * @param {Object} payload - Background response payload from ANALYSIS_START
 * @param {string} platform - Detected platform identifier
 * @returns {{ product: Object, reviews: Object[] }}
 */
function buildLastResult(payload, platform) {
  if (!payload) return null;

  const product = {
    title:    payload.pageTitle ?? '',
    url:      payload.url      ?? '',
    platform: platform         ?? '',
    image:    '',
    price:    '',
  };

  return {
    product,
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
  };
}
