import React from 'react';

/**
 * Renders the evidence list from the summary generator.
 */
export default function EvidenceList({ items }) {
  if (!items?.length) {
    return (
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Evidence
        </h2>
        <p className="text-xs text-slate-500 bg-slate-800/30 rounded-lg border border-slate-800 p-3">
          No supporting evidence was recorded for the current analysis.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        Evidence
      </h2>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={`${index}-${item}`}
            className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 border border-slate-700/50 rounded-lg p-3"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
