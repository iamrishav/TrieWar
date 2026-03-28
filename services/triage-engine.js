import { processWithGemini, verifyWithGrounding } from './gemini-service.js';
import { enrichContext } from './context-enricher.js';

/**
 * TRIAGE ENGINE — The 4-Stage Pipeline
 * 
 * Stage 1: CLASSIFY — Determine input type & urgency
 * Stage 2: ENRICH  — Add contextual data (location, time, etc.)
 * Stage 3: STRUCTURE — Convert to actionable response via Gemini
 * Stage 4: VERIFY — Cross-check with Google Search grounding
 * 
 * @param {Object} input - { text, image, inputType, location, timestamp }
 * @returns {Object} Complete triage response
 */
export async function triageInput(input) {
  const startTime = Date.now();

  try {
    // ── Stage 1: CLASSIFY ───────────────────────────────────────────
    const classification = classifyInput(input);

    // ── Stage 2: ENRICH ─────────────────────────────────────────────
    const enrichedInput = enrichContext(input, classification);

    // ── Stage 3: STRUCTURE — Process through Gemini ─────────────────
    const structuredResponse = await processWithGemini({
      text: enrichedInput.enrichedText,
      image: input.image,
      inputType: input.inputType,
    });

    // ── Stage 4: VERIFY — Cross-check with Search Grounding ────────
    let verifications = [];
    if (
      structuredResponse.search_queries &&
      structuredResponse.search_queries.length > 0
    ) {
      verifications = await verifyWithGrounding(
        structuredResponse.search_queries
      );
    }

    // ── Compose Final Response ──────────────────────────────────────
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
        },
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Triage pipeline error:', error);

    return {
      success: false,
      error: 'Failed to process input through the triage pipeline.',
      triage: {
        severity: 'normal',
        category: 'general',
        title: 'Processing Error',
        summary:
          'We encountered an issue processing your input. Please try again or rephrase your input.',
        actions: [
          {
            priority: 1,
            action: 'Try rephrasing your input',
            details:
              'Be as specific as possible about the situation, including location, people involved, and what happened.',
            timeframe: 'Immediately',
            type: 'information',
          },
          {
            priority: 2,
            action: 'If this is a real emergency, call 112 immediately',
            details:
              'Do not rely solely on this app in life-threatening situations. Call emergency services directly.',
            timeframe: 'Immediately',
            type: 'emergency',
          },
        ],
        emergency_contacts: [
          {
            name: 'Universal Emergency',
            number: '112',
            relevance: 'For any emergency in India',
          },
        ],
        key_findings: [],
        warnings: [
          'This app is an assistance tool. Always call emergency services directly in life-threatening situations.',
        ],
        follow_up: [],
        verifications: [],
        metadata: {
          inputType: input.inputType,
          processingTimeMs: processingTime,
          timestamp: input.timestamp,
          error: error.message,
        },
      },
    };
  }
}

/**
 * Stage 1: Classify input to determine likely category and pre-processing needs
 */
function classifyInput(input) {
  const text = (input.text || '').toLowerCase();

  // Keyword-based pre-classification for faster routing
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
    disaster: [
      'flood', 'earthquake', 'cyclone', 'tsunami', 'landslide', 'storm',
      'tornado', 'hurricane', 'drought', 'wildfire', 'evacuation',
      'shelter', 'rescue', 'relief', 'disaster', 'emergency',
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

  // Image inputs default to a visual analysis category if no text clues
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
