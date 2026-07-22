import React from 'react';

/**
 * Header component displaying extension title, platform badge, and active status.
 */
export default function Header({ title = 'Review Authenticity Lab', platform, subtitle }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
      <div className="flex items-center space-x-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-sm shadow-indigo-500/50" />
        <div>
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {platform && (
        <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 rounded-md">
          {platform}
        </span>
      )}
    </header>
  );
}
