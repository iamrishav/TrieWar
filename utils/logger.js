/**
 * @module utils/logger
 * @description Centralized logging utility for the application. Standardizes logs
 * and allows for future expansions to external logging services like Datadog or ELK.
 */

const info = (message, meta = {}) => {
  console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, ...meta }));
};

const warn = (message, meta = {}) => {
  console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, ...meta }));
};

const error = (message, errorObj = null, meta = {}) => {
  const logObj = { level: 'error', timestamp: new Date().toISOString(), message, ...meta };
  if (errorObj) {
    logObj.error = {
      message: errorObj.message || String(errorObj),
      stack: errorObj.stack,
      status: errorObj.status
    };
  }
  console.error(JSON.stringify(logObj));
};

export const logger = { info, warn, error };
export default logger;
