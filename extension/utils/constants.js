/**
 * @module constants
 * @description Central registry of all immutable constants used across the extension.
 * All modules must import values from here rather than defining their own string literals.
 *
 * WHY: Centralizing constants prevents typo-driven bugs, makes refactoring safe,
 * and serves as living documentation of the extension's communication protocol.
 */

// ─── Platform Identifiers ───────────────────────────────────────────────────

/** Supported review platforms. Used by extractors and content coordinator. */
export const PLATFORMS = Object.freeze({
  AMAZON:      'amazon',
  GOOGLE_PLAY: 'google_play',
  UNKNOWN:     'unknown',
});

/**
 * Maps hostname substrings to platform identifiers.
 * Checked in order — first match wins.
 */
export const SUPPORTED_SITES = Object.freeze([
  { pattern: 'amazon.',     platform: PLATFORMS.AMAZON },
  { pattern: 'play.google', platform: PLATFORMS.GOOGLE_PLAY },
]);

// ─── Message Types ───────────────────────────────────────────────────────────

/**
 * Typed message contracts for chrome.runtime.sendMessage / postMessage.
 * Convention: "DOMAIN/ACTION" — makes log traces self-explanatory.
 */
export const MSG = Object.freeze({
  // Content → Background
  PAGE_DETECTED:        'PAGE/DETECTED',
  REVIEWS_EXTRACTED:    'REVIEWS/EXTRACTED',
  EXTRACTION_FAILED:    'EXTRACTION/FAILED',

  // Popup → Background
  ANALYSIS_START:       'ANALYSIS/START',
  OPEN_SIDE_PANEL:      'UI/OPEN_SIDE_PANEL',
  GET_PAGE_STATUS:      'PAGE/GET_STATUS',

  // Side Panel → Background
  GET_SNAPSHOT:         'SNAPSHOT/GET',
  GET_LATEST_SNAPSHOT:  'SNAPSHOT/GET_LATEST',

  // Background → Content
  EXTRACT_NOW:          'EXTRACTION/EXTRACT_NOW',

  // Background → Popup / Side Panel
  PAGE_STATUS_RESULT:   'PAGE/STATUS_RESULT',
  ANALYSIS_COMPLETE:    'ANALYSIS/COMPLETE',
  ANALYSIS_PROGRESS:    'ANALYSIS/PROGRESS',
  ANALYSIS_ERROR:       'ANALYSIS/ERROR',

  // Background → Side Panel
  SNAPSHOT_READY:       'SNAPSHOT/READY',
});

// ─── Storage ─────────────────────────────────────────────────────────────────

/** IndexedDB database name and current schema version. */
export const DB = Object.freeze({
  NAME:    'ReviewAuthenticityLab',
  VERSION: 1,

  /** Object store names. */
  STORES: Object.freeze({
    SNAPSHOTS: 'snapshots',
    LABELS:    'labels',
  }),
});

/** chrome.storage.local keys for lightweight ephemeral state. */
export const STORAGE_KEYS = Object.freeze({
  ACTIVE_TAB_PLATFORM: 'activeTabPlatform',
  ACTIVE_TAB_PRODUCT:  'activeTabProduct',
  ANALYSIS_STATE:      'analysisState',
  SETTINGS:            'settings',
});

// ─── Analysis Signal Types ────────────────────────────────────────────────────

/**
 * Signal identifiers produced by each analysis module.
 * Used to tag SignalResult objects so the UI can render them uniformly.
 */
export const SIGNALS = Object.freeze({
  SENTIMENT_MISMATCH: 'sentiment_mismatch',
  DUPLICATE_REVIEW:   'duplicate_review',
  BURST_ACTIVITY:     'burst_activity',
  REVIEWER_PATTERN:   'reviewer_pattern',
});

/** Severity levels for a SignalResult. */
export const SEVERITY = Object.freeze({
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
});

// ─── Analysis State Machine ───────────────────────────────────────────────────

/** Possible states of the analysis pipeline. Reflected in popup and side panel UI. */
export const ANALYSIS_STATUS = Object.freeze({
  IDLE:        'idle',
  EXTRACTING:  'extracting',
  ANALYZING:   'analyzing',
  COMPLETE:    'complete',
  ERROR:       'error',
});

// ─── UI ───────────────────────────────────────────────────────────────────────

/** Human-readable labels for severity levels. */
export const SEVERITY_LABELS = Object.freeze({
  [SEVERITY.LOW]:    'Low Risk',
  [SEVERITY.MEDIUM]: 'Medium Risk',
  [SEVERITY.HIGH]:   'High Risk',
});

/** Human-readable labels for platform identifiers. */
export const PLATFORM_LABELS = Object.freeze({
  [PLATFORMS.AMAZON]:      'Amazon',
  [PLATFORMS.GOOGLE_PLAY]: 'Google Play',
  [PLATFORMS.UNKNOWN]:     'Unknown',
});

// ─── Performance Tuning ───────────────────────────────────────────────────────

/** Debounce/throttle durations in milliseconds. */
export const TIMINGS = Object.freeze({
  /** MutationObserver debounce to avoid flooding on rapid DOM changes. */
  OBSERVER_DEBOUNCE_MS: 400,

  /** Delay before retrying pagination detection after a DOM update. */
  PAGINATION_RETRY_MS:  600,

  /** Maximum time to wait for a model to load before failing. */
  MODEL_LOAD_TIMEOUT_MS: 30_000,
});

// ─── Limits ───────────────────────────────────────────────────────────────────

export const LIMITS = Object.freeze({
  /** Maximum number of reviews to process in a single analysis run. */
  MAX_REVIEWS_PER_RUN: 500,

  /** Minimum reviews required to run burst detection. */
  MIN_REVIEWS_FOR_BURST: 10,

  /** Jaccard similarity threshold above which two reviews are flagged as duplicates. */
  DUPLICATE_SIMILARITY_THRESHOLD: 0.85,

  /** Maximum snapshots to retain per product before evicting oldest. */
  MAX_SNAPSHOTS_PER_PRODUCT: 30,
});
