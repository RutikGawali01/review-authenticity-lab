import React from 'react';
import Button from './Button.jsx';

/**
 * Error container displaying issue details and retry actions.
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-4 my-2 text-center space-y-3">
      <div className="w-8 h-8 rounded-full bg-rose-900/60 text-rose-300 flex items-center justify-center mx-auto text-sm font-bold">
        ✕
      </div>
      <div>
        <h3 className="text-xs font-semibold text-rose-200 uppercase tracking-wide">
          Analysis Encountered an Issue
        </h3>
        <p className="text-xs text-rose-300/80 mt-1">
          {message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="text-xs py-1.5">
          Retry Analysis
        </Button>
      )}
    </div>
  );
}
