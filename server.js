import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// ── Polyfill for Node.js < 18 (Headers, Request, Response) ──────────
if (typeof globalThis.Headers === 'undefined') {
  const { default: fetch, Headers, Request, Response } = await import('node-fetch');
  globalThis.fetch = globalThis.fetch || fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

import { triageInput } from './services/triage-engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com; connect-src 'self'; frame-src https://www.google.com https://maps.google.com"
  );
  next();
});

// ── Body Parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting (simple in-memory) ─────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap.get(ip).filter((t) => t > windowStart);
  requests.push(now);
  rateLimitMap.set(ip, requests);

  if (requests.length > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
    });
  }

  next();
}

// ── Static Files ─────────────────────────────────────────────────────
app.use(express.static(join(__dirname, 'public')));

// ── Health Check ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'TRIAGE AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Maps Config Endpoint ─────────────────────────────────────────────
app.get('/api/config/maps', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  });
});

// ── Main Triage Endpoint ─────────────────────────────────────────────
app.post('/api/triage', rateLimit, async (req, res) => {
  try {
    const { text, image, inputType, location } = req.body;

    // Input validation
    if (!text && !image) {
      return res.status(400).json({
        error: 'Please provide text or image input.',
      });
    }

    // Sanitize text input
    const sanitizedText = text
      ? text.replace(/<[^>]*>/g, '').trim().substring(0, 5000)
      : '';

    const result = await triageInput({
      text: sanitizedText,
      image: image || null,
      inputType: inputType || 'text',
      location: location || null,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (error) {
    console.error('Triage error:', error);
    res.status(500).json({
      error: 'An error occurred while processing your input.',
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

// ── SPA Fallback ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚨 TRIAGE AI — Server Running         ║
  ║   http://localhost:${PORT}                  ║
  ║   From Chaos to Clarity, Instantly.      ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
