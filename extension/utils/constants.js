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

/** Amazon layout page types for target selector profile matching. */
export const AMAZON_PAGE_TYPES = Object.freeze({
  PRODUCT_PAGE: 'PRODUCT_PAGE',
  REVIEWS_PAGE: 'REVIEWS_PAGE',
  UNKNOWN:      'UNKNOWN',
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
 * All messages MUST use the `type` field.
 */
export const MSG = Object.freeze({
  // System
  PING:                 'SYSTEM/PING',
  ERROR:                'SYSTEM/ERROR',

  // Popup → Background / Background → Popup
  GET_PAGE_STATUS:      'PAGE/GET_STATUS',
  PAGE_STATUS_RESULT:   'PAGE/STATUS_RESULT',
  ANALYSIS_START:       'ANALYSIS/START',
  ANALYSIS_COMPLETE:    'ANALYSIS/COMPLETE',
  ANALYSIS_PROGRESS:    'ANALYSIS/PROGRESS',
  ANALYSIS_ERROR:       'ANALYSIS/ERROR',

  // Background → Content Script / Content → Background
  EXTRACT_REVIEWS:      'EXTRACTION/EXTRACT_REVIEWS',
  REVIEWS_EXTRACTED:    'EXTRACTION/REVIEWS_EXTRACTED',
  EXTRACTION_FAILED:    'EXTRACTION/EXTRACTION_FAILED',

  // UI & Side Panel
  OPEN_SIDE_PANEL:      'UI/OPEN_SIDE_PANEL',
  GET_SNAPSHOT:         'SNAPSHOT/GET',
  GET_LATEST_SNAPSHOT:  'SNAPSHOT/GET_LATEST',
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

/** Configurable maximum review extraction limit. */
export const MAX_REVIEWS = 200;

export const LIMITS = Object.freeze({
  /** Maximum number of reviews to process in a single analysis run. */
  MAX_REVIEWS_PER_RUN: 500,

  /** Minimum reviews required to run burst detection. */
  MIN_REVIEWS_FOR_BURST: 10,

  /** Jaccard similarity threshold above which two reviews are flagged as duplicates. */
  DUPLICATE_SIMILARITY_THRESHOLD: 0.85,

  /** Maximum snapshots to retain per product before evicting oldest. */
  MAX_SNAPSHOTS_PER_PRODUCT: 30,

  /** Maximum pagination limits for Amazon review extraction. */
  MAX_PAGINATION_PAGES: 30,
  MAX_PAGINATION_REVIEWS: MAX_REVIEWS,
});
