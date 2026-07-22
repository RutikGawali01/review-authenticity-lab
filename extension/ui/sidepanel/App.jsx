import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../../src/components/Header.jsx';
import Button from '../../../src/components/Button.jsx';
import Loader from '../../../src/components/Loader.jsx';
import ErrorState from '../../../src/components/ErrorState.jsx';
import EmptyState from '../../../src/components/EmptyState.jsx';
import SignalBadge from '../../../src/components/SignalBadge.jsx';
import MetricCard from '../../../src/components/MetricCard.jsx';
import SummaryCard from '../../../src/components/SummaryCard.jsx';
import ReviewCard from '../../../src/components/ReviewCard.jsx';
import SectionTitle from '../../../src/components/SectionTitle.jsx';
import { 
  getLatestSnapshot, 
  getSnapshot, 
  subscribeToSnapshotReady 
} from '../../../src/services/extensionService.js';
import { PLATFORM_LABELS, SEVERITY } from '../../utils/constants.js';

export default function SidepanelApp() {
  const [snapshot, setSnapshot] = useState(null);
  const [signals, setSignals] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLatest();

    const unsubscribe = subscribeToSnapshotReady((snapshotId) => {
      loadSnapshotById(snapshotId);
    });

    return () => unsubscribe();
  }, []);

  const loadLatest = async () => {
    setLoading(true);
    setError(null);

    const response = await getLatestSnapshot();

    if (response?.success && response.payload) {
      const { snapshot: snap, signals: sigs, history: hist, summary: sum } = response.payload;
      setSnapshot(snap);
      setSignals(sigs || []);
      setHistory(hist || []);
      setSummary(sum || null);
    } else if (response?.code === 'NO_SNAPSHOT') {
      setSnapshot(null);
    } else {
      setError(response?.error || 'Failed to load analysis snapshot.');
    }

    setLoading(false);
  };

  const loadSnapshotById = async (snapshotId) => {
    setLoading(true);
    setError(null);

    const response = await getSnapshot(snapshotId);

    if (response?.success && response.payload) {
      const { snapshot: snap, signals: sigs, history: hist, summary: sum } = response.payload;
      setSnapshot(snap);
      setSignals(sigs || []);
      setHistory(hist || []);
      setSummary(sum || null);
    } else {
      setError(response?.error || `Failed to load snapshot ${snapshotId}`);
    }

    setLoading(false);
  };

  const overallRisk = useMemo(() => {
    if (!signals.length) return SEVERITY.LOW;
    if (signals.some(s => s.severity === SEVERITY.HIGH)) return SEVERITY.HIGH;
    if (signals.some(s => s.severity === SEVERITY.MEDIUM)) return SEVERITY.MEDIUM;
    return SEVERITY.LOW;
  }, [signals]);

  const filteredSignals = useMemo(() => {
    if (filter === 'all') return signals;
    return signals.filter(s => s.severity === filter);
  }, [signals, filter]);

  const metrics = snapshot?.metrics || snapshot?.meta || {};
  const breakdown = metrics.ratingBreakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalCount = metrics.totalReviews || 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans antialiased max-w-md mx-auto flex flex-col justify-between">
      <div>
        <Header 
          title="Authenticity Lab" 
          subtitle={snapshot?.productTitle || 'Dashboard'}
          platform={snapshot?.platform ? (PLATFORM_LABELS[snapshot.platform] || snapshot.platform) : undefined}
        />

        {loading ? (
          <Loader text="Fetching snapshot metrics..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadLatest} />
        ) : !snapshot ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {/* Risk Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              overallRisk === SEVERITY.HIGH ? 'bg-rose-950/60 border-rose-800/80 text-rose-200' :
              overallRisk === SEVERITY.MEDIUM ? 'bg-amber-950/60 border-amber-800/80 text-amber-200' :
              'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
            }`}>
              <div className="flex items-center space-x-3">
                <span className="text-xl">
                  {overallRisk === SEVERITY.HIGH ? '⚠️' : overallRisk === SEVERITY.MEDIUM ? '⚡' : '✓'}
                </span>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    {overallRisk === SEVERITY.HIGH ? 'High Risk Detected' : overallRisk === SEVERITY.MEDIUM ? 'Medium Risk Detected' : 'Low Risk / Organic'}
                  </h2>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {signals.length} anomaly signal{signals.length !== 1 ? 's' : ''} evaluated
                  </p>
                </div>
              </div>
            </div>

            {/* Narrative Summary */}
            <SummaryCard summary={summary} />

            {/* Key Statistics Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-3">
              <MetricCard label="Total Reviews" value={metrics.totalReviews ?? 0} />
              <MetricCard label="Average Rating" value={metrics.averageRating !== null && metrics.averageRating !== undefined ? `${Number(metrics.averageRating).toFixed(1)}★` : '—'} />
              <MetricCard label="Verified Buyers" value={metrics.verifiedCount ?? 0} />
              <MetricCard label="Flagged Reviews" value={new Set(signals.map(s => s.reviewId)).size} />
            </div>

            {/* Rating Breakdown Bars */}
            <div>
              <SectionTitle icon="📊">Rating Breakdown</SectionTitle>
              <div className="space-y-1.5 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = breakdown[stars] || 0;
                  const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
                  return (
                    <div key={stars} className="flex items-center space-x-2 text-xs">
                      <span className="w-6 font-medium text-slate-400">{stars}★</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/60">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-slate-400 text-[11px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signals Section */}
            <div>
              <SectionTitle icon="🚩" count={signals.length}>
                Authenticity Signals
              </SectionTitle>

              {/* Severity Filter Buttons */}
              <div className="flex space-x-1.5 my-2">
                {['all', 'high', 'medium', 'low'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                      filter === f
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Signals List */}
              {filteredSignals.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 bg-slate-800/30 rounded-lg border border-slate-800">
                  No signals found for filter "{filter}".
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSignals.map((sig, i) => (
                    <ReviewCard key={sig.id || i} signal={sig} />
                  ))}
                </div>
              )}
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div>
                <SectionTitle icon="📜" count={history.length}>
                  Snapshot History
                </SectionTitle>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {history.map((snap) => (
                    <div 
                      key={snap.id}
                      onClick={() => loadSnapshotById(snap.id)}
                      className={`p-2.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer transition-colors ${
                        snap.id === snapshot.id 
                          ? 'bg-indigo-950/50 border-indigo-600 text-indigo-200 font-semibold' 
                          : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>
                        {new Date(snap.capturedAtMs).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className="text-[11px] opacity-75">
                        {snap.metrics?.totalReviews || snap.meta?.totalReviews || 0} reviews
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 mt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
        <span>Review Authenticity Lab v1.0</span>
        <button 
          onClick={loadLatest}
          className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
