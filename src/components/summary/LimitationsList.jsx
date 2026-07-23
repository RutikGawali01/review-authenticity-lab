import React from 'react';

/**
 * Renders analysis limitations returned by the summary generator.
 */
export default function LimitationsList({ items }) {
  if (!items?.length) return null;

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        Limitations
      </h2>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={`${index}-${item}`}
            className="text-xs text-slate-400 leading-relaxed bg-slate-900/40 border border-slate-800 rounded-lg p-3"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
