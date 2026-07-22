import React from 'react';

/**
 * Empty/Welcome state component shown when no snapshot is selected or available.
 */
export default function EmptyState({
  title = 'No Active Analysis',
  description = 'Open an Amazon or Google Play product page and click "Analyze Reviews" to begin scanning.',
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 text-center space-y-2.5 my-4">
      <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-lg">
        🔍
      </div>
      <h3 className="text-sm font-semibold text-slate-200">
        {title}
      </h3>
      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
        {description}
      </p>
    </div>
  );
}
