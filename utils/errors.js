/**
 * TRIAGE AI — Custom Error Classes
 *
 * Provides a structured error hierarchy for better error handling,
 * logging, and API response generation throughout the application.
 *
 * @module utils/errors
 */

/**
 * Base error class for all TRIAGE AI application errors.
 * Extends native Error with an HTTP status code and error code string.
 */
export class TriageError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} [statusCode=500] - HTTP status code for API responses
   * @param {string} [code='TRIAGE_ERROR'] - Machine-readable error code
   */
  constructor(message, statusCode = 500, code = 'TRIAGE_ERROR') {
    super(message);
    this.name = 'TriageError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Error thrown when an external API call times out.
 */
export class ApiTimeoutError extends TriageError {
  /**
   * @param {string} [serviceName='external API'] - Name of the timed-out service
   * @param {number} [timeoutMs=15000] - Timeout duration in milliseconds
   */
  constructor(serviceName = 'external API', timeoutMs = 15000) {
    super(
      `Request to ${serviceName} timed out after ${timeoutMs}ms`,
      504,
      'API_TIMEOUT'
    );
    this.name = 'ApiTimeoutError';
    this.serviceName = serviceName;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when request validation fails.
 */
export class ValidationError extends TriageError {
  /**
   * @param {string} message - Validation failure description
   * @param {string} [field=''] - The field that failed validation
   */
  constructor(message, field = '') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error thrown when API quota is exceeded (e.g., Gemini 429).
 */
export class QuotaExceededError extends TriageError {
  /**
   * @param {string} [serviceName='Gemini API'] - Name of the rate-limited service
   */
  constructor(serviceName = 'Gemini API') {
    super(
      `${serviceName} quota exceeded. Please wait for quota to reset.`,
      429,
      'QUOTA_EXCEEDED'
    );
    this.name = 'QuotaExceededError';
    this.serviceName = serviceName;
  }
}
