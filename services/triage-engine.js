/**
 * TRIAGE AI — Triage Engine (Core Pipeline)
 *
 * The brain of the application. Implements a 4-stage processing pipeline:
 *
 * 1. **CLASSIFY** — Keyword-based pre-classification determines input category
 * 2. **ENRICH** — Context enricher adds time, location, and seasonal awareness
 * 3. **STRUCTURE** — Gemini AI processes the enriched input
 * 4. **VERIFY** — Google Search grounding cross-checks key claims
 *
 * @module triage-engine
 */

import { processWithGemini, verifyWithGrounding } from './gemini-service.js';
import { enrichContext } from './context-enricher.js';
import { generateLocalFallback } from './local-fallback.js';

/**
 * Process input through the complete 4-stage TRIAGE pipeline.
 */
export async function triageInput(input) {
  const startTime = Date.now();

  // ── Stage 1: CLASSIFY ───────────────────────────────────────────
  const classification = classifyInput(input);

  // ── Stage 2: ENRICH ─────────────────────────────────────────────
  const enrichedInput = enrichContext(input, classification);

  try {
    // ── Stage 3: STRUCTURE — Process through Gemini ─────────────────
    const structuredResponse = await processWithGemini({
      text: enrichedInput.enrichedText,
      image: input.image,
      inputType: input.inputType,
    });

    // ── Stage 4: VERIFY — Cross-check with Search Grounding ────────
    let verifications = [];
    try {
      if (
        structuredResponse.search_queries &&
        structuredResponse.search_queries.length > 0
      ) {
        verifications = await verifyWithGrounding(
          structuredResponse.search_queries
        );
      }
    } catch (verifyError) {
      console.error('Verification stage failed (non-blocking):', verifyError.message);
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      triage: {
        ...structuredResponse,
        verifications,
        metadata: {
          inputType: input.inputType,
          classification: classification,
          processingTimeMs: processingTime,
          timestamp: input.timestamp,
          location: input.location,
          pipeline: ['classify', 'enrich', 'structure', 'verify'],
          googleServices: ['gemini-2.0-flash', 'google-search-grounding'],
          source: 'gemini',
        },
      },
    };
  } catch (error) {
    // ── SMART FALLBACK ──
    const processingTime = Date.now() - startTime;
    const errorType = error.status === 429 ? 'quota_exceeded' : 'api_error';

    console.error(`Triage pipeline: Gemini ${errorType}, activating smart local fallback.`);

    const localResponse = generateLocalFallback(input, classification);

    return {
      success: true, 
      triage: {
        ...localResponse,
        verifications: [],
        metadata: {
          inputType: input.inputType,
          classification: classification,
          processingTimeMs: processingTime,
          timestamp: input.timestamp,
          location: input.location,
          pipeline: ['classify', 'enrich', 'local-fallback'],
          googleServices: ['local-intelligence-engine'],
          source: 'local-fallback',
          fallbackReason: errorType,
        },
      },
    };
  }
}

/**
 * Stage 1: Classify input to determine likely category.
 */
function classifyInput(input) {
  const text = (input.text || '').toLowerCase();

  const patterns = {
    medical: [
      'blood', 'pain', 'injury', 'hurt', 'hospital', 'doctor', 'medicine',
      'prescription', 'tablet', 'dose', 'symptom', 'fever', 'breathing',
      'heart', 'ambulance', 'unconscious', 'allergy', 'drug', 'medical',
      'health', 'patient', 'diagnosis', 'treatment', 'surgery', 'infection',
      'wound', 'fracture', 'bleeding', 'bp', 'sugar', 'diabetes',
    ],
    accident: [
      'accident', 'crash', 'collision', 'hit', 'road', 'car', 'bike',
      'truck', 'vehicle', 'traffic', 'fallen', 'trapped', 'fire',
      'burning', 'explosion', 'derail', 'overturn',
    ],
    fire: [
      'fire', 'flames', 'smoke', 'burning', 'explosion', 'gas leak', 'lpg',
      'cylinder leak', 'short circuit', 'on fire', 'building on fire',
    ],
    disaster: [
      'flood', 'earthquake', 'cyclone', 'tsunami', 'landslide', 'storm',
      'tornado', 'hurricane', 'drought', 'wildfire', 'evacuation',
      'shelter', 'rescue', 'relief', 'disaster', 'emergency',
    ],
    animal: [
      'dog', 'cat', 'cow', 'animal', 'stray', 'wildlife', 'snake', 'monkey',
      'bite', 'rabies', 'injured dog', 'animal rescue',
    ],
    health_records: [
      'record', 'history', 'report', 'test result', 'lab', 'scan',
      'x-ray', 'mri', 'ct scan', 'biopsy', 'blood test', 'ecg',
      'prescription', 'past medical', 'chronic', 'medication list',
    ],
    safety: [
      'theft', 'robbery', 'assault', 'attack', 'threat', 'suspicious',
      'police', 'danger', 'unsafe', 'harassment', 'stalking', 'abuse',
      'kidnap', 'missing', 'lost child',
    ],
    weather: [
      'weather', 'forecast', 'monsoon', 'rain', 'heatwave', 'coldwave',
      'warning', 'alert', 'lightning', 'thunder', 'imd',
    ],
  };

  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(patterns)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  if (input.image && bestScore === 0) {
    bestCategory = 'visual_analysis';
  }

  return {
    likelyCategory: bestCategory,
    confidence: Math.min(bestScore / 3, 1),
    hasImage: !!input.image,
    hasText: !!input.text,
    inputLength: (input.text || '').length,
  };
}
