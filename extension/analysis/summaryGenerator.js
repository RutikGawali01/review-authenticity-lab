/**
 * @module analysis/summaryGenerator
 * @description Generates a human-readable analysis summary from signal results.
 *
 * In Phase 2, this module will optionally use the Gemini or Groq API to produce
 * a natural-language narrative. In foundation phase, it produces a structured
 * text summary from signal counts without any LLM dependency.
 *
 * WHY optional LLM:
 * - The extension must work without any API key.
 * - The LLM enhances the output but is never required for core functionality.
 * - The fallback (structured template) ensures the UI always has something to show.
 */

import { SEVERITY, SEVERITY_LABELS } from '../utils/constants.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} AnalysisSummary
 * @property {string}  text             - Narrative summary text.
 * @property {string}  riskLevel        - SEVERITY constant (overall risk).
 * @property {number}  totalSignals     - Total number of signals detected.
 * @property {Object}  signalCounts     - Count of signals per type.
 * @property {boolean} generatedByLLM   - True if text was LLM-generated.
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates an AnalysisSummary from an array of signal results.
 *
 * @param {Object}   opts
 * @param {Object[]} opts.signals     - All signal objects from the analysis run.
 * @param {Object}   opts.snapshot    - The Snapshot these signals belong to.
 * @param {boolean}  [opts.useLLM]    - Whether to attempt LLM summary generation.
 * @param {string}   [opts.apiKey]    - API key for the LLM provider (if useLLM).
 * @returns {Promise<AnalysisSummary>}
 */
export async function generateSummary({ signals, snapshot, useLLM = false, apiKey = null }) {
  const counts   = countSignalsBySeverity(signals);
  const risk     = computeOverallRisk(counts);

  const summary = buildStructuredSummary({ signals, counts, risk, snapshot });

  if (useLLM && apiKey) {
    try {
      const llmText = await generateLLMNarrative({ summary, signals, apiKey });
      return { ...summary, text: llmText, generatedByLLM: true };
    } catch (err) {
      console.warn('[Summary] LLM generation failed, falling back to structured summary:', err.message);
    }
  }

  return summary;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Counts signals grouped by severity.
 *
 * @param {Object[]} signals
 * @returns {{ high: number, medium: number, low: number }}
 */
function countSignalsBySeverity(signals) {
  return signals.reduce((acc, s) => {
    acc[s.severity] = (acc[s.severity] ?? 0) + 1;
    return acc;
  }, { [SEVERITY.HIGH]: 0, [SEVERITY.MEDIUM]: 0, [SEVERITY.LOW]: 0 });
}

/**
 * Determines the overall risk level from signal severity counts.
 *
 * @param {{ high: number, medium: number, low: number }} counts
 * @returns {string} SEVERITY constant.
 */
function computeOverallRisk(counts) {
  if (counts[SEVERITY.HIGH] > 0)   return SEVERITY.HIGH;
  if (counts[SEVERITY.MEDIUM] > 0) return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

/**
 * Builds the structured (non-LLM) analysis summary.
 *
 * @param {Object} opts
 * @returns {AnalysisSummary}
 */
function buildStructuredSummary({ signals, counts, risk, snapshot }) {
  const totalReviews = snapshot?.meta?.totalReviews ?? 0;
  const flagged      = new Set(signals.map(s => s.reviewId)).size;

  const text = [
    `Analyzed ${totalReviews} reviews for ${snapshot?.productTitle || 'this product'}.`,
    `${flagged} review(s) flagged with ${signals.length} signal(s) detected.`,
    counts[SEVERITY.HIGH]   ? `⚠ ${counts[SEVERITY.HIGH]} high-severity signal(s).`   : '',
    counts[SEVERITY.MEDIUM] ? `▲ ${counts[SEVERITY.MEDIUM]} medium-severity signal(s).` : '',
    counts[SEVERITY.LOW]    ? `▼ ${counts[SEVERITY.LOW]} low-severity signal(s).`      : '',
  ].filter(Boolean).join('\n');

  return {
    text,
    riskLevel:    risk,
    totalSignals: signals.length,
    signalCounts: counts,
    generatedByLLM: false,
  };
}

/**
 * Calls the Gemini or Groq API to generate a natural-language narrative.
 * TODO(Phase 2): Implement LLM call with structured prompt.
 *
 * @param {Object} opts
 * @returns {Promise<string>}
 */
async function generateLLMNarrative({ summary, signals, apiKey }) {
  // TODO(Phase 2): Implement Gemini / Groq API call.
  throw new Error('LLM narrative generation not yet implemented.');
}
