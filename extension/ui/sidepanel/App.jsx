import React, { useState, useEffect } from 'react';
import Header from '../../../src/components/Header.jsx';
import Loader from '../../../src/components/Loader.jsx';
import ErrorState from '../../../src/components/ErrorState.jsx';
import EmptyState from '../../../src/components/EmptyState.jsx';
import SummaryReport from '../../../src/components/summary/SummaryReport.jsx';
import { getStoredAnalysisState } from '../../../src/services/extensionService.js';
import { STORAGE_KEYS } from '../../utils/constants.js';

export default function SidepanelApp() {
  const [summary, setSummary] = useState(null);
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStoredAnalysis();

    // Listen for storage updates so the panel updates live if an analysis runs
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.ANALYSIS_STATE]) {
        const newState = changes[STORAGE_KEYS.ANALYSIS_STATE].newValue;
        if (newState) {
          setSummary(newState.summary || null);
          setPageTitle(newState.pageTitle || '');
        } else {
          setSummary(null);
          setPageTitle('');
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const loadStoredAnalysis = async () => {
    setLoading(true);
    setError(null);

    const response = await getStoredAnalysisState();

    if (response?.success) {
      const data = response.payload;
      if (data) {
        setSummary(data.summary || null);
        setPageTitle(data.pageTitle || '');
      } else {
        setSummary(null);
        setPageTitle('');
      }
    } else {
      setError(response?.error || 'Failed to read stored analysis.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans antialiased max-w-md mx-auto flex flex-col justify-between">
      <div>
        <Header
          title="Authenticity Lab"
          subtitle={pageTitle || 'Side Panel Dashboard'}
        />

        {loading ? (
          <Loader text="Loading analysis results..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadStoredAnalysis} />
        ) : !summary ? (
          <EmptyState
            title="No Active Analysis"
            description="Analyze a product to see authenticity signals."
          />
        ) : (
          <div className="space-y-4 my-2">
            <SummaryReport summary={summary} />
          </div>
        )}
      </div>

      <div className="pt-4 mt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
        <span>Review Authenticity Lab v1.0</span>
        <button
          onClick={loadStoredAnalysis}
          className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
