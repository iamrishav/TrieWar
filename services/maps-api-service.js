/**
 * TRIAGE AI — Google Maps Platform API Service
 *
 * Server-side integration with Google Maps Platform APIs:
 * - Places API (New) — Nearby search for emergency services
 * - Directions API — Routing to nearest facilities
 * - Geocoding API — Reverse geocoding coordinates to addresses
 *
 * All calls are proxied through the server to protect the API key.
 * Includes request timeouts via AbortController to prevent hung connections.
 *
 * @module services/maps-api-service
 */

import logger from '../utils/logger.js';
import { API_TIMEOUT_MS, MAX_PLACES_RESULTS, DEFAULT_SEARCH_RADIUS_M } from '../utils/constants.js';

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE = 'https://places.googleapis.com/v1/places:searchNearby';
const DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';
const GEOCODING_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Create an AbortController with a timeout.
 * Automatically aborts the request after the specified duration.
 *
 * @param {number} [timeoutMs=API_TIMEOUT_MS] - Timeout in milliseconds
 * @returns {{ signal: AbortSignal, clear: Function }} Signal and cleanup function
 * @private
 */
function createTimeout(timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

/**
 * Search for nearby emergency-relevant places using Google Places API (New).
 *
 * @param {Object} params - Search parameters
 * @param {number} params.lat - Latitude of the user's location
 * @param {number} params.lng - Longitude of the user's location
 * @param {string} params.category - Triage category (medical, accident, disaster, safety)
 * @param {number} [params.radiusMeters=5000] - Search radius in meters
 * @returns {Promise<Object>} Places API response with nearby facilities
 * @throws {Error} When API key is not configured
 */
export async function searchNearbyPlaces({ lat, lng, category, radiusMeters = DEFAULT_SEARCH_RADIUS_M }) {
  if (!MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  // Map triage categories to Google Places types
  const categoryToTypes = {
    medical: ['hospital', 'doctor', 'pharmacy', 'physiotherapist'],
    accident: ['hospital', 'police', 'fire_station'],
    disaster: ['fire_station', 'local_government_office', 'hospital'],
    health_records: ['hospital', 'doctor', 'pharmacy'],
    safety: ['police', 'local_government_office'],
    general: ['hospital', 'police', 'fire_station'],
  };

  const includedTypes = categoryToTypes[category] || categoryToTypes.general;

  const requestBody = {
    includedTypes,
    maxResultCount: MAX_PLACES_RESULTS,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    rankPreference: 'DISTANCE',
  };

  const timeout = createTimeout();
  try {
    const response = await fetch(PLACES_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.nationalPhoneNumber,places.rating,places.currentOpeningHours,places.websiteUri,places.googleMapsUri',
      },
      body: JSON.stringify(requestBody),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Places API error', null, { status: response.status, body: errorData });
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our simplified format
    const places = (data.places || []).map((place) => ({
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress || '',
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      phone: place.nationalPhoneNumber || null,
      rating: place.rating || null,
      types: place.types || [],
      isOpen: place.currentOpeningHours?.openNow ?? null,
      mapsUrl: place.googleMapsUri || null,
      website: place.websiteUri || null,
    }));

    return {
      success: true,
      places,
      center: { lat, lng },
      searchCategory: category,
      radius: radiusMeters,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Places API request timed out', null, { timeoutMs: API_TIMEOUT_MS });
    } else {
      logger.error('Places search error', error);
    }
    return {
      success: false,
      places: [],
      error: error.message,
    };
  } finally {
    timeout.clear();
  }
}

/**
 * Get directions from user's location to a destination using Google Directions API.
 *
 * @param {Object} params - Direction parameters
 * @param {number} params.originLat - Origin latitude
 * @param {number} params.originLng - Origin longitude
 * @param {number} params.destLat - Destination latitude
 * @param {number} params.destLng - Destination longitude
 * @param {string} [params.mode='driving'] - Travel mode (driving, walking, transit)
 * @returns {Promise<Object>} Directions API response with route details
 * @throws {Error} When API key is not configured
 */
export async function getDirections({ originLat, originLng, destLat, destLng, mode = 'driving' }) {
  if (!MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const params = new URLSearchParams({
    origin: `${originLat},${originLng}`,
    destination: `${destLat},${destLng}`,
    mode,
    key: MAPS_API_KEY,
    language: 'en',
    units: 'metric',
  });

  const timeout = createTimeout();
  try {
    const response = await fetch(`${DIRECTIONS_BASE}?${params}`, {
      signal: timeout.signal,
    });
    const data = await response.json();

    if (data.status !== 'OK') {
      logger.error('Directions API error', null, { status: data.status, errorMessage: data.error_message });
      return {
        success: false,
        error: data.error_message || data.status,
      };
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      success: true,
      route: {
        distance: leg.distance?.text || '',
        distanceMeters: leg.distance?.value || 0,
        duration: leg.duration?.text || '',
        durationSeconds: leg.duration?.value || 0,
        startAddress: leg.start_address || '',
        endAddress: leg.end_address || '',
        steps: (leg.steps || []).map((step) => ({
          instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || '',
          distance: step.distance?.text || '',
          duration: step.duration?.text || '',
          travelMode: step.travel_mode,
        })),
        polyline: route.overview_polyline?.points || '',
        bounds: route.bounds,
      },
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Directions API request timed out', null, { timeoutMs: API_TIMEOUT_MS });
    } else {
      logger.error('Directions error', error);
    }
    return {
      success: false,
      error: error.message,
    };
  } finally {
    timeout.clear();
  }
}

/**
 * Reverse geocode coordinates to a human-readable address using Google Geocoding API.
 *
 * @param {Object} params - Geocoding parameters
 * @param {number} params.lat - Latitude to geocode
 * @param {number} params.lng - Longitude to geocode
 * @returns {Promise<Object>} Geocoding result with formatted address and components
 * @throws {Error} When API key is not configured
 */
export async function reverseGeocode({ lat, lng }) {
  if (!MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: MAPS_API_KEY,
    language: 'en',
    result_type: 'street_address|locality|sublocality',
  });

  const timeout = createTimeout();
  try {
    const response = await fetch(`${GEOCODING_BASE}?${params}`, {
      signal: timeout.signal,
    });
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      logger.error('Geocoding API error', null, { status: data.status, errorMessage: data.error_message });
      return {
        success: false,
        error: data.error_message || data.status,
      };
    }

    const result = data.results?.[0];

    if (!result) {
      return {
        success: true,
        address: 'Address not found',
        components: {},
      };
    }

    // Extract useful components
    const components = {};
    for (const comp of result.address_components || []) {
      if (comp.types.includes('locality')) components.city = comp.long_name;
      if (comp.types.includes('administrative_area_level_1')) components.state = comp.long_name;
      if (comp.types.includes('country')) components.country = comp.long_name;
      if (comp.types.includes('postal_code')) components.pincode = comp.long_name;
      if (comp.types.includes('sublocality_level_1')) components.area = comp.long_name;
    }

    return {
      success: true,
      address: result.formatted_address || '',
      components,
      placeId: result.place_id,
      location: {
        lat: result.geometry?.location?.lat,
        lng: result.geometry?.location?.lng,
      },
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.error('Geocoding API request timed out', null, { timeoutMs: API_TIMEOUT_MS });
    } else {
      logger.error('Geocoding error', error);
    }
    return {
      success: false,
      error: error.message,
    };
  } finally {
    timeout.clear();
  }
}
