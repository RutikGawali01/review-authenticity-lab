import React from 'react';

/**
 * Section title heading with optional count badge.
 */
export default function SectionTitle({ children, count, icon }) {
  return (
    <div className="flex items-center justify-between my-3 pb-1 border-b border-slate-800">
      <div className="flex items-center space-x-1.5">
        {icon && <span className="text-xs">{icon}</span>}
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {children}
        </h3>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
          {count}
        </span>
      )}
    </div>
  );
}
