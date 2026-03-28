/**
 * TRIAGE AI — Google Maps JavaScript API Service
 *
 * Interactive map integration using Google Maps JavaScript API with:
 * - Dynamic map rendering with custom severity-coded markers
 * - Google Places API (nearby search) for emergency services discovery
 * - Google Directions API for routing to nearest facilities
 * - Google Geocoding API for reverse geocoding coordinates to addresses
 * - InfoWindows with place details (phone, rating, open status)
 *
 * All API calls are proxied through the server to protect API keys.
 *
 * @module MapService
 */

/* global google */

const MapService = {
  apiKey: null,
  map: null,
  markers: [],
  directionsRenderer: null,
  infoWindow: null,
  mapLoaded: false,
  loadPromise: null,
  userLocation: null,
  geocodedAddress: null,

  /**
   * Fetch the Maps API key from the server and load the Google Maps JS API.
   * Caches the API key after first fetch.
   * @returns {Promise<string>} The Maps API key
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
   * Dynamically load the Google Maps JavaScript API.
   * Uses the recommended async script loading pattern.
   * @returns {Promise<void>} Resolves when Maps API is loaded
   */
  async loadMapsAPI() {
    if (this.mapLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    const apiKey = await this.loadApiKey();
    if (!apiKey) return;

    this.loadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        this.mapLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.mapLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  },

  /**
   * Render an interactive Google Map in the given container.
   * Shows nearby emergency services based on triage category.
   *
   * @param {HTMLElement} container - DOM element to render the map in
   * @param {Object} triage - Triage result with category and severity
   */
  async renderMap(container, triage) {
    if (!container) return;

    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      container.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-tertiary);">Map unavailable — API key not configured.</p>';
      return;
    }

    // Show loading state
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:var(--text-tertiary);"><span>Loading map...</span></div>';

    try {
      await this.loadMapsAPI();
    } catch {
      container.innerHTML = '<p style="text-align:center; padding:2rem; color:var(--text-tertiary);">Failed to load Google Maps.</p>';
      return;
    }

    // Get user location
    let center = { lat: 28.6139, lng: 77.209 }; // Default: New Delhi
    if (this.userLocation) {
      center = this.userLocation;
    } else {
      try {
        const loc = await this.getCurrentLocation();
        center = loc;
        this.userLocation = loc;
      } catch {
        // Use default
      }
    }

    // Clear previous markers
    this.clearMarkers();

    // Create the map
    container.innerHTML = '';
    const mapDiv = document.createElement('div');
    mapDiv.style.height = '350px';
    mapDiv.style.width = '100%';
    mapDiv.style.borderRadius = '12px';
    mapDiv.id = 'google-map-interactive';
    mapDiv.setAttribute('aria-label', 'Interactive map showing nearby emergency services');
    container.appendChild(mapDiv);

    this.map = new google.maps.Map(mapDiv, {
      center,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: this.getDarkMapStyle(),
    });

    this.infoWindow = new google.maps.InfoWindow();

    // Add user location marker
    const userMarker = new google.maps.Marker({
      position: center,
      map: this.map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 1000,
    });

    userMarker.addListener('click', () => {
      this.infoWindow.setContent(`
        <div style="padding:8px;color:#333;">
          <strong>📍 Your Location</strong>
          <p style="margin:4px 0 0;font-size:12px;">${this.geocodedAddress || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`}</p>
        </div>
      `);
      this.infoWindow.open(this.map, userMarker);
    });

    this.markers.push(userMarker);

    // Reverse geocode user's location
    this.reverseGeocodeLocation(center);

    // Search for nearby places via server proxy
    this.searchAndDisplayPlaces(center, triage);

    // Add location info bar below map
    const infoBar = document.createElement('div');
    infoBar.className = 'map-info-bar';
    infoBar.id = 'map-info-bar';
    infoBar.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.8rem;">📍 Detecting your location...</span>';
    container.appendChild(infoBar);
  },

  /**
   * Search for nearby emergency services and display them on the map.
   * Uses the server-proxied Google Places API endpoint.
   *
   * @param {Object} center - Center coordinates {lat, lng}
   * @param {Object} triage - Triage result with category
   */
  async searchAndDisplayPlaces(center, triage) {
    try {
      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: center.lat,
          lng: center.lng,
          category: triage.category || 'general',
          radius: 5000,
        }),
      });

      const data = await response.json();

      if (data.success && data.places?.length > 0) {
        this.displayPlaceMarkers(data.places, triage);
        this.updateInfoBar(data.places, triage);

        // Get directions to nearest place
        if (data.places[0]) {
          this.showDirectionsToPlace(center, data.places[0]);
        }
      }
    } catch (error) {
      console.error('Places search error:', error);
    }
  },

  /**
   * Display place markers on the map with custom icons based on place type.
   *
   * @param {Object[]} places - Array of place objects from the API
   * @param {Object} triage - Triage result for severity-based styling
   */
  displayPlaceMarkers(places, triage) {
    const severityColors = {
      critical: '#ef4444',
      urgent: '#f59e0b',
      normal: '#22c55e',
    };

    const typeIcons = {
      hospital: '🏥',
      police: '🚔',
      fire_station: '🚒',
      pharmacy: '💊',
      doctor: '👨‍⚕️',
    };

    places.forEach((place, index) => {
      if (!place.lat || !place.lng) return;

      const mainType = place.types?.find((t) => typeIcons[t]) || 'hospital';
      const color = severityColors[triage.severity] || severityColors.normal;

      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: this.map,
        title: place.name,
        label: {
          text: String(index + 1),
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 'bold',
        },
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1.5,
          anchor: new google.maps.Point(12, 22),
          labelOrigin: new google.maps.Point(12, 10),
        },
      });

      // InfoWindow content with place details
      const openStatus = place.isOpen === true ? '🟢 Open' : place.isOpen === false ? '🔴 Closed' : '';
      const ratingStars = place.rating ? '⭐'.repeat(Math.round(place.rating)) : '';

      marker.addListener('click', () => {
        this.infoWindow.setContent(`
          <div style="padding:8px;max-width:250px;color:#333;font-family:Inter,sans-serif;">
            <strong style="font-size:14px;">${typeIcons[mainType] || '📍'} ${this.escapeHtml(place.name)}</strong>
            <p style="margin:6px 0 4px;font-size:12px;color:#666;">${this.escapeHtml(place.address)}</p>
            ${place.phone ? `<p style="margin:2px 0;font-size:12px;"><a href="tel:${place.phone}" style="color:#1a73e8;">📞 ${place.phone}</a></p>` : ''}
            ${place.rating ? `<p style="margin:2px 0;font-size:12px;">${ratingStars} ${place.rating}/5</p>` : ''}
            ${openStatus ? `<p style="margin:2px 0;font-size:12px;">${openStatus}</p>` : ''}
            ${place.mapsUrl ? `<p style="margin:6px 0 0;"><a href="${place.mapsUrl}" target="_blank" rel="noopener" style="color:#1a73e8;font-size:12px;">Open in Google Maps →</a></p>` : ''}
          </div>
        `);
        this.infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
    });
  },

  /**
   * Show driving directions from user location to the nearest place.
   * Uses the server-proxied Directions API.
   *
   * @param {Object} origin - Origin coordinates {lat, lng}
   * @param {Object} place - Destination place object
   */
  async showDirectionsToPlace(origin, place) {
    if (!place.lat || !place.lng) return;

    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: place.lat,
          destLng: place.lng,
          mode: 'driving',
        }),
      });

      const data = await response.json();

      if (data.success && data.route) {
        // Draw the route polyline on the map
        if (data.route.polyline) {
          const decodedPath = google.maps.geometry
            ? google.maps.geometry.encoding.decodePath(data.route.polyline)
            : [];

          if (decodedPath.length > 0) {
            const routeLine = new google.maps.Polyline({
              path: decodedPath,
              geodesic: true,
              strokeColor: '#4285F4',
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: this.map,
            });
            this.markers.push(routeLine); // Track for cleanup
          }
        }

        // Update the info bar with directions info
        const infoBar = document.getElementById('map-info-bar');
        if (infoBar) {
          const existing = infoBar.innerHTML;
          infoBar.innerHTML = `${existing} <span style="margin-left:12px;">🚗 ${this.escapeHtml(place.name)} — ${data.route.distance}, ~${data.route.duration}</span>`;
        }
      }
    } catch (error) {
      console.error('Directions error:', error);
    }
  },

  /**
   * Reverse geocode the user's coordinates to a readable address.
   * Updates the info bar below the map with the resolved address.
   *
   * @param {Object} location - Coordinates {lat, lng}
   */
  async reverseGeocodeLocation(location) {
    try {
      const response = await fetch('/api/geocode/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.lat, lng: location.lng }),
      });

      const data = await response.json();

      if (data.success && data.address) {
        this.geocodedAddress = data.address;
        const infoBar = document.getElementById('map-info-bar');
        if (infoBar) {
          infoBar.innerHTML = `<span style="color:var(--text-secondary);font-size:0.8rem;">📍 ${this.escapeHtml(data.address)}</span>`;
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  },

  /**
   * Update the info bar below the map with place search results.
   *
   * @param {Object[]} places - Array of nearby places found
   * @param {Object} triage - Triage result
   */
  updateInfoBar(places, triage) {
    const infoBar = document.getElementById('map-info-bar');
    if (!infoBar || places.length === 0) return;

    const nearestOpen = places.find((p) => p.isOpen !== false);
    if (nearestOpen) {
      const address = this.geocodedAddress || '';
      infoBar.innerHTML = `
        <span style="color:var(--text-secondary);font-size:0.8rem;">
          📍 ${address ? this.escapeHtml(address) + ' · ' : ''}
          Found ${places.length} nearby ${triage.category === 'medical' ? 'hospitals/clinics' : 'services'}
        </span>
      `;
    }
  },

  /**
   * Clear all markers and overlays from the map.
   */
  clearMarkers() {
    this.markers.forEach((m) => {
      if (m.setMap) m.setMap(null);
    });
    this.markers = [];
  },

  /**
   * Get dark mode map styling for the Google Maps instance.
   * Matches the app's dark-mode design system.
   *
   * @returns {Object[]} Google Maps style array
   */
  getDarkMapStyle() {
    return [
      { elementType: 'geometry', stylers: [{ color: '#1d1d2e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8b8ba0' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a40' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d1d2e' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c55' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
      { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#242438' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b80' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a2a40' }] },
    ];
  },

  /**
   * Get user's current location via browser geolocation API.
   * @returns {Promise<{lat: number, lng: number}>} User coordinates
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.userLocation = loc;
          resolve(loc);
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

  /**
   * Escape HTML special characters to prevent XSS.
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
