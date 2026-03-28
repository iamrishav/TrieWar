/**
 * TRIAGE AI — Application Constants
 *
 * Centralized configuration constants used across the application.
 * Eliminates magic numbers and provides a single source of truth
 * for all tunable parameters.
 *
 * @module utils/constants
 */

/** Maximum allowed length for user text input (characters) */
export const MAX_INPUT_LENGTH = 5000;

/** Maximum number of places returned from the Places API */
export const MAX_PLACES_RESULTS = 10;

/** Maximum number of verification queries sent to Google Search grounding */
export const MAX_VERIFICATION_QUERIES = 3;

/** Rate limiter: sliding window duration in milliseconds (1 minute) */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Rate limiter: maximum requests allowed per window per IP */
export const RATE_LIMIT_MAX_REQUESTS = 20;

/** Rate limiter: cleanup interval for stale entries in milliseconds (5 minutes) */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 300_000;

/** Timeout for external API calls (Maps, Firebase REST) in milliseconds */
export const API_TIMEOUT_MS = 15_000;

/** Default search radius for nearby places in meters */
export const DEFAULT_SEARCH_RADIUS_M = 5000;

/** Maximum number of triage history entries stored locally */
export const MAX_HISTORY_ENTRIES = 20;

/** Gemini model identifier */
export const GEMINI_MODEL = 'gemini-2.0-flash';

/** Gemini: maximum output tokens for triage response */
export const GEMINI_MAX_OUTPUT_TOKENS = 4096;

/** Gemini: maximum output tokens for verification response */
export const GEMINI_VERIFICATION_MAX_TOKENS = 1024;

/** Gemini: temperature for triage response (lower = more deterministic) */
export const GEMINI_TRIAGE_TEMPERATURE = 0.3;

/** Gemini: temperature for verification (very low for factual accuracy) */
export const GEMINI_VERIFICATION_TEMPERATURE = 0.1;

/** Gemini: top-p sampling parameter */
export const GEMINI_TOP_P = 0.8;

/** Maximum base64 image size to accept (bytes, ~8MB decoded) */
export const MAX_IMAGE_SIZE_BYTES = 10_485_760;

/** Application version */
export const APP_VERSION = '1.0.0';

/** Application name */
export const APP_NAME = 'TRIAGE AI';
