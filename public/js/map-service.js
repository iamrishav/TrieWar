/**
 * TRIAGE AI — Google Maps Service
 * Handles map embedding and location-based features
 */

const MapService = {
  apiKey: null,

  /**
   * Fetch the Maps API key from the server
   */
  async loadApiKey() {
    if (this.apiKey) return this.apiKey;
    try {
      const res = await fetch('/api/config/maps');
      const data = await res.json();
      this.apiKey = data.apiKey || '';
    } catch {
      this.apiKey = '';
    }
    return this.apiKey;
  },

  /**
   * Render a map in the given container
   * Uses Google Maps Embed API
   */
  async renderMap(container, triage) {
    if (!container) return;

    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      container.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-tertiary);">Map unavailable — API key not configured.</p>';
      return;
    }

    // Determine search query based on triage category
    const searchQueries = {
      medical: 'hospitals+nearby',
      accident: 'hospitals+police+stations+nearby',
      disaster: 'emergency+shelters+nearby',
      health_records: 'hospitals+clinics+nearby',
      safety: 'police+stations+nearby',
      general: 'emergency+services+nearby',
    };

    const category = triage.category || 'general';
    const searchQuery = searchQueries[category] || searchQueries.general;

    // Try to get user's location for the map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.embedMap(container, searchQuery, latitude, longitude, apiKey);
        },
        () => {
          // Fallback: use a generic embed without specific location
          this.embedMapGeneric(container, searchQuery, apiKey);
        },
        { timeout: 5000 }
      );
    } else {
      this.embedMapGeneric(container, searchQuery, apiKey);
    }
  },

  /**
   * Embed map with specific coordinates
   */
  embedMap(container, query, lat, lng, apiKey) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(query)}&center=${lat},${lng}&zoom=14`;
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.setAttribute('aria-label', 'Map showing nearby emergency services');
    iframe.title = 'Nearby emergency services map';
    container.innerHTML = '';
    container.appendChild(iframe);
  },

  /**
   * Embed map without specific coordinates (generic fallback)
   */
  embedMapGeneric(container, query, apiKey) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${encodeURIComponent(query)}`;
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.setAttribute('aria-label', 'Map showing nearby emergency services');
    iframe.title = 'Nearby emergency services map';
    container.innerHTML = '';
    container.appendChild(iframe);
  },

  /**
   * Get user's current location
   * @returns {Promise<{lat: number, lng: number}>}
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  },
};
