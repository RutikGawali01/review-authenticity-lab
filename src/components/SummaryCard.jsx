import React from 'react';

/**
 * Renders narrative summary text provided by analysis engine or LLM summary.
 */
export default function SummaryCard({ summary }) {
  if (!summary?.text) return null;

  return (
    <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3.5 my-3">
      <div className="flex items-center space-x-1.5 mb-1.5">
        <span className="text-xs">✨</span>
        <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
          Analysis Summary
        </h4>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        {summary.text}
      </p>
    </div>
  );
}
