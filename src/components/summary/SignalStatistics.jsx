import React from 'react';
import MetricCard from '../MetricCard.jsx';

/**
 * Displays signal statistics returned by the summary generator.
 */
export default function SignalStatistics({ statistics }) {
  if (!statistics) return null;

  const items = [
    { label: 'Total Reviews', value: statistics.totalReviews ?? 0 },
    { label: 'Rating Mismatches', value: statistics.ratingMismatches ?? 0 },
    { label: 'Duplicate Reviews', value: statistics.duplicateReviews ?? 0 },
    { label: 'Verified Purchases', value: statistics.verifiedPurchases ?? 0 },
  ];

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        Signal Statistics
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}
