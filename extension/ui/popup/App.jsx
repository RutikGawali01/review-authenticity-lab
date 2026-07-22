import React, { useState, useEffect } from 'react';
import Header from '../../../src/components/Header.jsx';
import Button from '../../../src/components/Button.jsx';
import Loader from '../../../src/components/Loader.jsx';
import ErrorState from '../../../src/components/ErrorState.jsx';
import MetricCard from '../../../src/components/MetricCard.jsx';
import { getPageStatus, startAnalysis, openSidePanel } from '../../../src/services/extensionService.js';
import { ANALYSIS_STATUS, PLATFORMS, PLATFORM_LABELS } from '../../utils/constants.js';

export default function PopupApp() {
  const [status, setStatus] = useState(ANALYSIS_STATUS.IDLE);
  const [platform, setPlatform] = useState(PLATFORMS.UNKNOWN);
  const [productTitle, setProductTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPageStatus();
  }, []);

  const fetchPageStatus = async () => {
    setLoading(true);
    setError(null);

    const response = await getPageStatus();

    if (response?.success && response.payload) {
      const { platform: plt, analysisState, context } = response.payload;
      setPlatform(plt || PLATFORMS.UNKNOWN);
      setStatus(analysisState || ANALYSIS_STATUS.IDLE);
      if (context?.productTitle) {
        setProductTitle(context.productTitle);
      }
    } else {
      setError(response?.error || 'Could not connect to extension background worker.');
    }
    setLoading(false);
  };

  const handleAnalyzeClick = async () => {
    setStatus(ANALYSIS_STATUS.EXTRACTING);
    setError(null);

    const response = await startAnalysis();

    if (response?.success) {
      setStatus(ANALYSIS_STATUS.COMPLETE);
    } else {
      setStatus(ANALYSIS_STATUS.ERROR);
      setError(response?.error || 'Analysis execution failed.');
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
