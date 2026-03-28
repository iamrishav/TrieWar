/**
 * TRIAGE AI — Centralized Logging Utility
 *
 * Provides structured JSON logging with multiple severity levels.
 * All application modules must use this logger instead of raw `console` calls
 * to ensure consistent, parseable log output suitable for production monitoring.
 *
 * Supported levels: `debug`, `info`, `warn`, `error`
 *
 * @module utils/logger
 */

/**
 * Log an informational message.
 * Use for routine operational events (server start, request processing, etc.).
 *
 * @param {string} message - Log message
 * @param {Object} [meta={}] - Additional structured metadata
 */
const info = (message, meta = {}) => {
  console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...meta }));
};

/**
 * Log a warning message.
 * Use for recoverable issues that deserve attention (fallback activation, retries, etc.).
 *
 * @param {string} message - Warning message
 * @param {Object} [meta={}] - Additional structured metadata
 */
const warn = (message, meta = {}) => {
  console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...meta }));
};

/**
 * Log an error message with optional error object details.
 * Use for failures that impact functionality (API errors, crashes, etc.).
 *
 * @param {string} message - Error description
 * @param {Error|null} [errorObj=null] - The Error object (stack trace, status extracted automatically)
 * @param {Object} [meta={}] - Additional structured metadata
 */
const error = (message, errorObj = null, meta = {}) => {
  const logObj = { level: 'error', timestamp: new Date().toISOString(), message, ...meta };
  if (errorObj) {
    logObj.error = {
      message: errorObj.message || String(errorObj),
      stack: errorObj.stack,
      status: errorObj.status,
      code: errorObj.code,
    };
  }
  console.error(JSON.stringify(logObj));
};

/**
 * Log a debug message.
 * Use for detailed diagnostic information during development.
 * Only emits output when `NODE_ENV` is not `production`.
 *
 * @param {string} message - Debug message
 * @param {Object} [meta={}] - Additional structured metadata
 */
const debug = (message, meta = {}) => {
  if (process.env.NODE_ENV === 'production') return;
  console.debug(JSON.stringify({ level: 'debug', timestamp: new Date().toISOString(), message, ...meta }));
};

export const logger = { info, warn, error, debug };
export default logger;
