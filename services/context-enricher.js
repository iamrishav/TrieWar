/**
 * Context Enricher — Adds real-world context to raw input
 * 
 * Enriches the user's input with:
 * - Location context (if provided by browser geolocation)
 * - Time-of-day context (rush hour, night, etc.)
 * - Day-of-week context (weekday/weekend affects service availability)
 * - Season/weather context
 */

/**
 * Enrich the input with contextual information
 * @param {Object} input - Raw user input
 * @param {Object} classification - Pre-classification from Stage 1
 * @returns {Object} Enriched input
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
 * Get time-of-day context
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
 * Get location context
 */
function getLocationContext(location) {
  if (!location || !location.lat || !location.lng) {
    return 'Location not available. Recommendations will be generalized.';
  }

  return `User coordinates: ${location.lat}, ${location.lng}. Use these coordinates to suggest nearby emergency services, hospitals, police stations, and relevant facilities.`;
}
