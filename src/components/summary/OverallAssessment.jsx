import React from 'react';

/**
 * Displays the overall assessment headline from the summary generator.
 */
export default function OverallAssessment({ text }) {
  if (!text) return null;

  return (
    <section className="p-4 rounded-xl border bg-slate-800/50 border-slate-700/60">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        Overall Assessment
      </h2>
      <p className="text-sm text-slate-100 leading-relaxed">
        {text}
      </p>
    </section>
  );
}
