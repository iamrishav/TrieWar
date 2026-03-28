/**
 * @module middlewares/validator
 * @description Request validation and sanitization middlewares.
 */

import logger from '../utils/logger.js';

/**
 * Sanitizes input text, stripping unseen control characters, large script injections, 
 * while maintaining normal punctuation and valid characters.
 * @param {string} text - Raw input text
 * @returns {string} Sanitized string
 */
export function sanitizeText(text) {
  if (!text) return '';
  // 1. Remove basic HTML tags and scripts
  let clean = text.replace(/<[^>]*>?/gm, '');
  // 2. Trim and limit length to prevent massive payloads
  clean = clean.trim().substring(0, 5000);
  return clean;
}

/**
 * Validates triage endpoints payload safely.
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
export function validateTriagePayload(req, res, next) {
  const { text, image, inputType, location } = req.body;

  if (!text && !image) {
    logger.warn('Validation failed: Missing text and image payload.');
    return res.status(400).json({ error: 'Please provide valid text or image input.' });
  }

  const validTypes = ['text', 'voice', 'camera', 'file'];
  if (inputType && !validTypes.includes(inputType)) {
    logger.warn(`Validation failed: Invalid inputType "${inputType}".`);
    return res.status(400).json({ error: 'Invalid inputType provided.' });
  }

  // Location basic structural validation
  if (location) {
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      logger.warn('Validation failed: Malformed location object.');
      return res.status(400).json({ error: 'Malformed location coordinates. Lat and Lng must be numbers.' });
    }
    if (location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
      logger.warn('Validation failed: Coordinates out of bounds.');
      return res.status(400).json({ error: 'Coordinates out of bounds.' });
    }
  }

  req.body.text = sanitizeText(text);
  next();
}

/**
 * Validates coordinates for Maps proxy endpoints.
 */
export function validateCoordinates(req, res, next) {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are strictly required.' });
  }

  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);

  if (isNaN(numericLat) || isNaN(numericLng)) {
    return res.status(400).json({ error: 'Latitude and longitude must be valid numbers.' });
  }

  if (numericLat < -90 || numericLat > 90 || numericLng < -180 || numericLng > 180) {
    return res.status(400).json({ error: 'Coordinates are out of bounds.' });
  }

  req.body.lat = numericLat;
  req.body.lng = numericLng;
  next();
}
