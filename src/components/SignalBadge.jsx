import React from 'react';

/**
 * Renders a color-coded severity risk badge (High, Medium, Low).
 */
export default function SignalBadge({ severity = 'low' }) {
  const styles = {
    high: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    medium: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    low: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  };

  const labels = {
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase border rounded-md ${styles[severity] || styles.low}`}>
      {labels[severity] || severity}
    </span>
  );
}
