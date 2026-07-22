import React from 'react';

/**
 * Metric card displaying a single aggregate statistic.
 */
export default function MetricCard({ label, value, subtext }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-center flex flex-col justify-center">
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-base font-bold text-slate-100 mt-0.5">
        {value ?? '—'}
      </span>
      {subtext && (
        <span className="text-[10px] text-slate-500 mt-0.5">
          {subtext}
        </span>
      )}
    </div>
  );
}
