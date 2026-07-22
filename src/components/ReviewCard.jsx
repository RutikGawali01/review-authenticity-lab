import React from 'react';
import SignalBadge from './SignalBadge.jsx';

/**
 * Display card for an individual review flagged with an anomaly signal.
 */
export default function ReviewCard({ signal }) {
  if (!signal) return null;

  const formattedType = (signal.signalType || signal.type || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="bg-slate-800/70 border border-slate-700/60 rounded-lg p-3 my-2 space-y-1.5 transition-colors hover:border-slate-600">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200">
          {formattedType || 'Detected Anomaly'}
        </span>
        <SignalBadge severity={signal.severity} />
      </div>
      <p className="text-xs text-slate-400 leading-normal">
        {signal.rationale}
      </p>
    </div>
  );
}
