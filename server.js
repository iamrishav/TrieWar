import './polyfill.js';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

import { triageInput } from './services/triage-engine.js';
import { searchNearbyPlaces, getDirections, reverseGeocode } from './services/maps-api-service.js';
import {
  isFirebaseConfigured,
  getFirebaseClientConfig,
  saveTriageSession,
  updateEmergencyStats,
  getRecentSessions,
  getEmergencyStatsSummary,
} from './services/firebase-service.js';

import logger from './utils/logger.js';
import { rateLimit } from './middlewares/rate-limiter.js';
import { setSecurityHeaders } from './middlewares/security.js';
import { validateTriagePayload, validateCoordinates } from './middlewares/validator.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ──────────────────────────────────────────────
app.use(setSecurityHeaders);

// ── Body Parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static Files ─────────────────────────────────────────────────────
app.use(express.static(join(__dirname, 'public')));

// ── Health Check ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'TRIAGE AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    googleServices: {
      gemini: !!process.env.GEMINI_API_KEY,
      maps: !!process.env.GOOGLE_MAPS_API_KEY,
      firebase: isFirebaseConfigured(),
    },
  });
});

// ── Config Endpoints ─────────────────────────────────────────────────

/**
 * GET /api/config/maps — Returns the Google Maps API key for client-side usage
 */
app.get('/api/config/maps', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  });
});

/**
 * GET /api/config/firebase — Returns Firebase client config for frontend initialization
 */
app.get('/api/config/firebase', (req, res) => {
  const config = getFirebaseClientConfig();
  res.json({
    configured: !!config,
    config: config || {},
  });
});

// ── Main Triage Endpoint ─────────────────────────────────────────────
app.post('/api/triage', rateLimit, validateTriagePayload, async (req, res) => {
  try {
    const { text, image, inputType, location } = req.body;

    logger.info(`Processing triage request (type: ${inputType})`);

    const result = await triageInput({
      text, // previously sanitized by validateTriagePayload
      image: image || null,
      inputType: inputType || 'text',
      location: location || null,
      timestamp: new Date().toISOString(),
    });

    // Save to Firebase Firestore (non-blocking)
    if (isFirebaseConfigured()) {
      saveTriageSession({
        inputText: text,
        inputType: inputType || 'text',
        triage: result.triage,
        location: location || null,
        userAgent: req.headers['user-agent'] || '',
      }).catch((err) => logger.warn(`Firebase update skipped: ${err.message}`));

      updateEmergencyStats(result.triage).catch((err) =>
        logger.warn(`Firebase stats skipped: ${err.message}`)
      );
    }

    res.json(result);
  } catch (error) {
    logger.error('Triage error caught at handler:', error);
    res.status(500).json({
      error: 'An internal error occurred while analyzing your situation.',
      severity: 'error',
    });
  }
});

// ── Streaming Triage Endpoint (SSE) ──────────────────────────────────
app.post('/api/triage/stream', rateLimit, async (req, res) => {
  try {
    const { text, image, inputType, location } = req.body;

    if (!text && !image) {
      return res.status(400).json({
        error: 'Please provide text or image input.',
      });
    }

    const sanitizedText = text
      ? text.replace(/<[^>]*>/g, '').trim().substring(0, 5000)
      : '';

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send processing stages as events
    const stages = ['classifying', 'enriching', 'structuring', 'verifying'];

    for (const stage of stages) {
      res.write(`data: ${JSON.stringify({ stage, status: 'processing' })}\n\n`);
    }

    const result = await triageInput({
      text: sanitizedText,
      image: image || null,
      inputType: inputType || 'text',
      location: location || null,
      timestamp: new Date().toISOString(),
    });

    // Save to Firebase (non-blocking)
    if (isFirebaseConfigured()) {
      saveTriageSession({
        inputText: sanitizedText,
        inputType: inputType || 'text',
        triage: result.triage,
        location: location || null,
        userAgent: req.headers['user-agent'] || '',
      }).catch(() => {});

      updateEmergencyStats(result.triage).catch(() => {});
    }

    res.write(`data: ${JSON.stringify({ stage: 'complete', result })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream triage error:', error);
    res.write(
      `data: ${JSON.stringify({ stage: 'error', error: 'Processing failed' })}\n\n`
    );
    res.end();
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ── Google Maps Platform API Proxy Endpoints ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/places/nearby — Search for nearby emergency services
 * Proxied through server to protect the Google Maps API key.
 *
 * @body {number} lat - User latitude
 * @body {number} lng - User longitude
 * @body {string} category - Triage category (medical, accident, disaster, safety)
 * @body {number} [radius=5000] - Search radius in meters
 */
app.post('/api/places/nearby', rateLimit, validateCoordinates, async (req, res) => {
  try {
    const { lat, lng, category, radius } = req.body;

    logger.info(`Fetching nearby places (category: ${category})`);

    const result = await searchNearbyPlaces({
      lat, // numeric validation ensures safety
      lng,
      category: category || 'general',
      radiusMeters: parseInt(radius, 10) || 5000,
    });

    res.json(result);
  } catch (error) {
    logger.error('Places API proxy error:', error);
    res.status(500).json({ error: 'Failed to search nearby places.' });
  }
});

/**
 * POST /api/directions — Get directions to a destination
 * Proxied through server to protect the Google Maps API key.
 *
 * @body {number} originLat - Origin latitude
 * @body {number} originLng - Origin longitude
 * @body {number} destLat - Destination latitude
 * @body {number} destLng - Destination longitude
 * @body {string} [mode=driving] - Travel mode
 */
app.post('/api/directions', rateLimit, async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng, mode } = req.body;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required.' });
    }

    const result = await getDirections({
      originLat: parseFloat(originLat),
      originLng: parseFloat(originLng),
      destLat: parseFloat(destLat),
      destLng: parseFloat(destLng),
      mode: mode || 'driving',
    });

    res.json(result);
  } catch (error) {
    console.error('Directions API proxy error:', error);
    res.status(500).json({ error: 'Failed to get directions.' });
  }
});

/**
 * POST /api/geocode/reverse — Reverse geocode coordinates to address
 * Proxied through server to protect the Google Maps API key.
 *
 * @body {number} lat - Latitude to geocode
 * @body {number} lng - Longitude to geocode
 */
app.post('/api/geocode/reverse', rateLimit, validateCoordinates, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const result = await reverseGeocode({ lat, lng });

    res.json(result);
  } catch (error) {
    logger.error('Geocoding API proxy error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ── Firebase Firestore History Endpoints ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

/**
 * GET /api/history — Get recent triage sessions from Firestore
 * @query {number} [limit=20] - Maximum sessions to retrieve
 */
app.get('/api/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await getRecentSessions(limit);
    res.json(result);
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

/**
 * GET /api/stats — Get emergency statistics summary from Firestore
 */
app.get('/api/stats', async (req, res) => {
  try {
    const result = await getEmergencyStatsSummary();
    res.json(result);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

// ── SPA Fallback ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  const firebaseStatus = isFirebaseConfigured() ? '✅ Connected' : '⚠️  Not configured';
  logger.info(`
  ╔══════════════════════════════════════════════════╗
  ║   🚨 TRIAGE AI — Server Running                 ║
  ║   http://localhost:${PORT}                          ║
  ║   From Chaos to Clarity, Instantly.              ║
  ║                                                  ║
  ║   Google Services:                               ║
  ║   • Gemini API: ✅ Ready                         ║
  ║   • Maps Platform: ✅ Ready                      ║
  ║   • Firebase: ${firebaseStatus.padEnd(33)}║
  ╚══════════════════════════════════════════════════╝
  `);
});

export default app;
