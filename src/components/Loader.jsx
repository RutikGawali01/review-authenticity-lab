import React from 'react';

/**
 * Loading spinner and message component.
 */
export default function Loader({ text = 'Analyzing review patterns…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <div className="relative w-10 h-10">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
      <p className="text-xs text-slate-300 font-medium animate-pulse text-center">
        {text}
      </p>
    </div>
  );
}
