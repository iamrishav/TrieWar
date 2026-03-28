/**
 * TRIAGE AI — Context Enricher Service
 *
 * Enriches raw user input with real-world contextual information
 * before sending to the Gemini AI model. This context helps produce
 * more relevant and location/time-aware emergency responses.
 *
 * Enrichment types:
 * - **Time context**: Rush hour, night, weekend awareness (affects service availability)
 * - **Location context**: GPS coordinates for nearby emergency services
 * - **Seasonal context**: Monsoon floods, summer heat, dengue season (India-specific)
 * - **Input type hints**: Voice transcription caveats, image analysis triggers
 * - **Pre-classification**: Category hints from keyword-based pre-filtering
 *
 * @module context-enricher
 */

/**
 * Enrich the user's input with contextual information for better AI processing.
 * Adds time, location, season, and input type context to help Gemini produce
 * more relevant and locally-appropriate emergency responses.
 *
 * @param {Object} input - Raw user input data
 * @param {string} [input.text] - Text input from the user
 * @param {string} input.inputType - Input type (text, voice, camera, file)
 * @param {string} input.timestamp - ISO timestamp of the request
 * @param {Object|null} [input.location] - User location from Geolocation API
 * @param {number} [input.location.lat] - Latitude
 * @param {number} [input.location.lng] - Longitude
 * @param {Object} classification - Pre-classification result from Stage 1
 * @param {string} classification.likelyCategory - Predicted category
 * @param {number} classification.confidence - Confidence score (0-1)
 * @returns {Object} Enriched input with contextual text prepended
 */
export function enrichContext(input, classification) {
  const contextParts = [];

  // Time context
  const timeContext = getTimeContext(input.timestamp);
  contextParts.push(`[TIME CONTEXT] ${timeContext}`);

  // Location context
  if (input.location) {
    const locationContext = getLocationContext(input.location);
    contextParts.push(`[LOCATION CONTEXT] ${locationContext}`);
  }

  // Classification hint for Gemini
  if (classification.likelyCategory !== 'general') {
    contextParts.push(
      `[PRE-CLASSIFICATION] This input appears to be related to: ${classification.likelyCategory} (confidence: ${(classification.confidence * 100).toFixed(0)}%)`
    );
  }

  // Input type context
  const inputTypeHints = {
    voice:
      '[INPUT TYPE] Transcribed from voice — may contain speech recognition errors. The speaker may be in distress.',
    camera:
      '[INPUT TYPE] Live camera capture — analyze the image for visual emergency/safety cues.',
    file: '[INPUT TYPE] Uploaded document — extract and structure all relevant information.',
    text: '[INPUT TYPE] Direct text input.',
  };
  contextParts.push(inputTypeHints[input.inputType] || inputTypeHints.text);

  // Build enriched text
  const enrichedText = [
    ...contextParts,
    '',
    '[USER INPUT]',
    input.text || '(Image input — see attached image)',
  ].join('\n');

  return {
    ...input,
    enrichedText,
    timeContext,
    classification,
  };
}

/**
 * Get time-of-day, day-of-week, and seasonal context.
 * Provides India-specific awareness for emergency service availability,
 * traffic conditions, and seasonal health risks.
 *
 * @param {string} timestamp - ISO timestamp to analyze
 * @returns {string} Descriptive time context string
 */
function getTimeContext(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const hour = date.getHours();
  const day = date.getDay();
  const month = date.getMonth();

  const parts = [];

  // Time of day
  if (hour >= 0 && hour < 5) {
    parts.push('Late night / early morning hours. Emergency services may have longer response times.');
  } else if (hour >= 5 && hour < 8) {
    parts.push('Early morning. Most clinics/offices opening soon.');
  } else if (hour >= 8 && hour < 10) {
    parts.push('Morning rush hour. Expect traffic congestion on major roads.');
  } else if (hour >= 10 && hour < 12) {
    parts.push('Mid-morning. Most services and offices are open.');
  } else if (hour >= 12 && hour < 14) {
    parts.push('Lunch hour. Some offices may have reduced staff.');
  } else if (hour >= 14 && hour < 17) {
    parts.push('Afternoon. All services typically operational.');
  } else if (hour >= 17 && hour < 20) {
    parts.push('Evening rush hour. Expect traffic congestion. Some offices closing.');
  } else if (hour >= 20 && hour < 23) {
    parts.push('Night. Limited services may be available. Prefer 24-hour facilities.');
  } else {
    parts.push('Late night. Only emergency services and 24-hour facilities available.');
  }

  // Day of week
  if (day === 0) {
    parts.push('Sunday — most government offices, clinics, and non-essential services are closed.');
  } else if (day === 6) {
    parts.push('Saturday — many offices have half-day or are closed.');
  } else {
    parts.push(`Weekday (${['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][day]}) — regular business hours apply.`);
  }

  // Season (India-relevant)
  if (month >= 3 && month <= 5) {
    parts.push('Summer season in India — heat-related risks elevated. Stay hydrated.');
  } else if (month >= 6 && month <= 8) {
    parts.push('Monsoon season in India — flood risks, waterlogging common. Exercise caution on roads.');
  } else if (month >= 9 && month <= 10) {
    parts.push('Post-monsoon season — watch for dengue/malaria outbreaks.');
  } else {
    parts.push('Winter season — fog may affect visibility and travel.');
  }

  return parts.join(' ');
}

/**
 * Get location context string from GPS coordinates.
 * Provides coordinate information for Gemini to suggest nearby services.
 *
 * @param {Object} location - User location object
 * @param {number} location.lat - Latitude
 * @param {number} location.lng - Longitude
 * @returns {string} Location context string
 */
function getLocationContext(location) {
  if (!location || !location.lat || !location.lng) {
    return 'Location not available. Recommendations will be generalized.';
  }

  return `User coordinates: ${location.lat}, ${location.lng}. Use these coordinates to suggest nearby emergency services, hospitals, police stations, and relevant facilities.`;
}
