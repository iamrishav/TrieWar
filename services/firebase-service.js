/**
 * TRIAGE AI — Firebase Firestore Service
 *
 * Server-side integration with Google Firebase Firestore using REST API.
 * Stores triage sessions, emergency statistics, and query history
 * in the cloud for persistence and analytics.
 *
 * Uses Firestore REST API to avoid heavy firebase-admin SDK dependency,
 * keeping the bundle lightweight for the 10MB repo limit.
 *
 * @module firebase-service
 */

import dotenv from 'dotenv';

dotenv.config();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIRESTORE_BASE = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
  : null;

/**
 * Check if Firebase is properly configured
 * @returns {boolean} True if Firebase config is available
 */
export function isFirebaseConfigured() {
  return !!(FIREBASE_PROJECT_ID && FIREBASE_API_KEY);
}

/**
 * Get Firebase client config for frontend initialization
 * Returns only public-safe config values
 *
 * @returns {Object|null} Firebase config for client SDK, or null if not configured
 */
export function getFirebaseClientConfig() {
  if (!isFirebaseConfigured()) return null;

  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
  };
}

/**
 * Save a triage session to Firestore
 * Stores the complete triage result with metadata for analytics and history.
 *
 * @param {Object} session - The triage session to save
 * @param {string} session.inputText - Original user input (truncated for privacy)
 * @param {string} session.inputType - Input type (text, voice, camera, file)
 * @param {Object} session.triage - Full triage response
 * @param {Object} [session.location] - User location if available
 * @returns {Promise<Object>} Created document reference
 */
export async function saveTriageSession(session) {
  if (!FIRESTORE_BASE) {
    return { success: false, error: 'Firebase not configured' };
  }

  const document = {
    fields: {
      inputText: { stringValue: (session.inputText || '').substring(0, 200) },
      inputType: { stringValue: session.inputType || 'text' },
      severity: { stringValue: session.triage?.severity || 'normal' },
      category: { stringValue: session.triage?.category || 'general' },
      title: { stringValue: session.triage?.title || 'Assessment' },
      actionsCount: { integerValue: String(session.triage?.actions?.length || 0) },
      processingTimeMs: { integerValue: String(session.triage?.metadata?.processingTimeMs || 0) },
      hasLocation: { booleanValue: !!(session.location?.lat && session.location?.lng) },
      locationRelevant: { booleanValue: !!session.triage?.location_relevant },
      verificationsCount: { integerValue: String(session.triage?.verifications?.length || 0) },
      createdAt: { timestampValue: new Date().toISOString() },
      userAgent: { stringValue: session.userAgent || 'server' },
    },
  };

  // Add location if available (for analytics — e.g., which areas have most emergencies)
  if (session.location?.lat && session.location?.lng) {
    document.fields.latitude = { doubleValue: session.location.lat };
    document.fields.longitude = { doubleValue: session.location.lng };
  }

  try {
    const response = await fetch(`${FIRESTORE_BASE}/triage_sessions?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore save error:', response.status, errorText);
      return { success: false, error: `Firestore error: ${response.status}` };
    }

    const result = await response.json();
    const docId = result.name?.split('/').pop() || '';

    return {
      success: true,
      documentId: docId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Firestore save error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update emergency statistics in Firestore
 * Maintains aggregate counters for severity levels and categories.
 *
 * @param {Object} triage - Triage result to aggregate
 * @returns {Promise<Object>} Update result
 */
export async function updateEmergencyStats(triage) {
  if (!FIRESTORE_BASE) {
    return { success: false, error: 'Firebase not configured' };
  }

  const severity = triage?.severity || 'normal';
  const category = triage?.category || 'general';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const statsDoc = {
    fields: {
      date: { stringValue: today },
      severity: { stringValue: severity },
      category: { stringValue: category },
      count: { integerValue: '1' },
      lastUpdated: { timestampValue: new Date().toISOString() },
    },
  };

  try {
    const response = await fetch(
      `${FIRESTORE_BASE}/emergency_stats?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statsDoc),
      }
    );

    return { success: response.ok };
  } catch (error) {
    console.error('Stats update error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve recent triage sessions from Firestore
 * Returns the most recent sessions ordered by creation time.
 *
 * @param {number} [limit=20] - Maximum number of sessions to retrieve
 * @returns {Promise<Object>} List of recent triage sessions
 */
export async function getRecentSessions(limit = 20) {
  if (!FIRESTORE_BASE) {
    return { success: false, sessions: [], error: 'Firebase not configured' };
  }

  // Use Firestore REST API structured query
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'triage_sessions' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: limit,
    },
  };

  try {
    const parentPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/${parentPath}:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore query error:', response.status, errorText);
      return { success: false, sessions: [] };
    }

    const results = await response.json();

    const sessions = (results || [])
      .filter((r) => r.document)
      .map((r) => {
        const fields = r.document.fields || {};
        return {
          id: r.document.name?.split('/').pop(),
          inputText: fields.inputText?.stringValue || '',
          inputType: fields.inputType?.stringValue || 'text',
          severity: fields.severity?.stringValue || 'normal',
          category: fields.category?.stringValue || 'general',
          title: fields.title?.stringValue || 'Assessment',
          processingTimeMs: parseInt(fields.processingTimeMs?.integerValue || '0', 10),
          createdAt: fields.createdAt?.timestampValue || '',
        };
      });

    return { success: true, sessions };
  } catch (error) {
    console.error('Firestore query error:', error.message);
    return { success: false, sessions: [], error: error.message };
  }
}

/**
 * Get emergency statistics summary from Firestore
 * Returns aggregated data about severity distribution and categories.
 *
 * @returns {Promise<Object>} Statistics summary
 */
export async function getEmergencyStatsSummary() {
  if (!FIRESTORE_BASE) {
    return { success: false, stats: {} };
  }

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'emergency_stats' }],
      orderBy: [{ field: { fieldPath: 'lastUpdated' }, direction: 'DESCENDING' }],
      limit: 100,
    },
  };

  try {
    const parentPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/${parentPath}:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      }
    );

    if (!response.ok) {
      return { success: false, stats: {} };
    }

    const results = await response.json();

    // Aggregate stats
    const stats = {
      total: 0,
      bySeverity: { critical: 0, urgent: 0, normal: 0 },
      byCategory: {},
    };

    (results || [])
      .filter((r) => r.document)
      .forEach((r) => {
        const fields = r.document.fields || {};
        const severity = fields.severity?.stringValue || 'normal';
        const category = fields.category?.stringValue || 'general';
        const count = parseInt(fields.count?.integerValue || '1', 10);

        stats.total += count;
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + count;
        stats.byCategory[category] = (stats.byCategory[category] || 0) + count;
      });

    return { success: true, stats };
  } catch (error) {
    console.error('Stats summary error:', error.message);
    return { success: false, stats: {} };
  }
}
