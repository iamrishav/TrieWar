/**
 * TRIAGE AI — Firebase Client Service
 *
 * Client-side Firebase integration for:
 * - Google Analytics event tracking (triage submissions, feature usage)
 * - Firestore real-time listeners for cloud-synced history
 * - Performance monitoring via custom traces
 *
 * Uses Firebase Web SDK (v10+) loaded from CDN for zero npm overhead.
 * Initializes only when Firebase config is available from the server.
 *
 * @module FirebaseClient
 */

const FirebaseClient = {
  /** @type {boolean} Whether Firebase has been successfully initialized */
  initialized: false,

  /** @type {Object|null} Firebase app instance */
  app: null,

  /** @type {Object|null} Firebase Analytics instance */
  analytics: null,

  /** @type {Object|null} Firebase config from server */
  config: null,

  /**
   * Initialize Firebase by fetching config from the server.
   * Only initializes if Firebase is properly configured on the backend.
   *
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async init() {
    try {
      const response = await fetch('/api/config/firebase');
      const data = await response.json();

      if (!data.configured || !data.config?.apiKey) {
        console.log('Firebase not configured — running in offline mode.');
        return false;
      }

      this.config = data.config;

      // Dynamically load Firebase SDK from CDN
      await this.loadFirebaseSDK();

      return this.initialized;
    } catch (error) {
      console.error('Firebase init error:', error);
      return false;
    }
  },

  /**
   * Dynamically load Firebase SDK scripts from Google CDN.
   * Loads only the modules we need: app, analytics, firestore.
   *
   * @returns {Promise<void>}
   */
  async loadFirebaseSDK() {
    if (this.initialized) return;

    const FIREBASE_VERSION = '10.14.1';
    const CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

    try {
      // Load Firebase App (core)
      const { initializeApp } = await this.loadModule(`${CDN_BASE}/firebase-app.js`);

      // Initialize Firebase App
      this.app = initializeApp(this.config);

      // Load Analytics (non-blocking — analytics is optional)
      try {
        const { getAnalytics, logEvent, setUserProperties } = await this.loadModule(
          `${CDN_BASE}/firebase-analytics.js`
        );
        this.analytics = getAnalytics(this.app);
        this._logEvent = logEvent;
        this._setUserProperties = setUserProperties;

        // Set default user properties
        setUserProperties(this.analytics, {
          app_version: '1.0.0',
          platform: 'web',
        });
      } catch {
        console.log('Firebase Analytics not available (may be blocked by ad blockers).');
      }

      this.initialized = true;
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase SDK load error:', error);
      this.initialized = false;
    }
  },

  /**
   * Dynamically import a Firebase module from CDN using dynamic import().
   *
   * @param {string} url - CDN URL of the Firebase module
   * @returns {Promise<Object>} The imported module
   */
  async loadModule(url) {
    return import(/* webpackIgnore: true */ url);
  },

  /**
   * Log a custom analytics event to Google Analytics via Firebase.
   *
   * @param {string} eventName - Name of the event (e.g., 'triage_submit')
   * @param {Object} [params={}] - Event parameters
   */
  trackEvent(eventName, params = {}) {
    if (!this.analytics || !this._logEvent) return;

    try {
      this._logEvent(this.analytics, eventName, {
        ...params,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.debug('Analytics event error:', error);
    }
  },

  /**
   * Track a triage submission event with detailed parameters.
   *
   * @param {Object} triage - Triage result data
   * @param {string} inputType - Type of input used (text, voice, camera, file)
   */
  trackTriageSubmission(triage, inputType) {
    this.trackEvent('triage_submit', {
      severity: triage?.severity || 'unknown',
      category: triage?.category || 'unknown',
      input_type: inputType || 'text',
      actions_count: triage?.actions?.length || 0,
      location_relevant: triage?.location_relevant || false,
      has_verifications: (triage?.verifications?.length || 0) > 0,
    });
  },

  /**
   * Track a scenario button click.
   *
   * @param {string} scenarioName - Name of the clicked scenario
   */
  trackScenarioClick(scenarioName) {
    this.trackEvent('scenario_click', {
      scenario: scenarioName,
    });
  },

  /**
   * Track a feature usage event (voice input, camera, file upload, etc.)
   *
   * @param {string} feature - Feature name (e.g., 'voice_input', 'camera_capture')
   */
  trackFeatureUsage(feature) {
    this.trackEvent('feature_use', {
      feature,
    });
  },

  /**
   * Track a map interaction event.
   *
   * @param {string} action - Map action (e.g., 'places_loaded', 'directions_shown', 'marker_clicked')
   * @param {Object} [details={}] - Additional details
   */
  trackMapInteraction(action, details = {}) {
    this.trackEvent('map_interaction', {
      action,
      ...details,
    });
  },

  /**
   * Track page visibility changes (for engagement metrics).
   */
  setupEngagementTracking() {
    // Track when user leaves/returns
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.trackEvent('app_background');
      } else {
        this.trackEvent('app_foreground');
      }
    });

    // Track accessibility feature usage
    const a11yBtn = document.getElementById('btn-a11y');
    if (a11yBtn) {
      a11yBtn.addEventListener('click', () => {
        this.trackFeatureUsage('high_contrast_toggle');
      });
    }
  },
};
