import React from 'react';
import OverallAssessment from './OverallAssessment.jsx';
import SignalStatistics from './SignalStatistics.jsx';
import EvidenceList from './EvidenceList.jsx';
import LimitationsList from './LimitationsList.jsx';

/**
 * Presentational summary report composed from SummaryResult fields.
 */
export default function SummaryReport({ summary }) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <OverallAssessment text={summary.overallAssessment} />
      <SignalStatistics statistics={summary.statistics} />
      <EvidenceList items={summary.evidence} />
      <LimitationsList items={summary.limitations} />
    </div>
  );
}
