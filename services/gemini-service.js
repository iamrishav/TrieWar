import '../polyfill.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * System instruction for the TRIAGE AI Gemini model.
 * Defines the 4-stage pipeline behavior (CLASSIFY → ENRICH → STRUCTURE → VERIFY)
 * with strict JSON output format enforcement.
 * @type {string}
 */
const TRIAGE_SYSTEM_INSTRUCTION = `You are TRIAGE AI — a universal emergency and action intelligence system. Your purpose is to act as a bridge between chaotic, unstructured real-world inputs and structured, verified, life-saving actions.

CORE BEHAVIOR:
1. CLASSIFY — Determine the input type and urgency level
2. ENRICH — Add relevant contextual information  
3. STRUCTURE — Convert to clear, prioritized action cards
4. VERIFY — Flag unverified claims, provide confidence levels

SEVERITY LEVELS:
- CRITICAL (🔴): Immediate life-threatening danger. Requires instant action.
- URGENT (🟡): Time-sensitive situation. Needs attention within hours.
- NORMAL (🟢): Informational or non-time-sensitive. Plan and execute at convenience.

OUTPUT FORMAT (respond ONLY with valid JSON):
{
  "severity": "critical" | "urgent" | "normal",
  "category": "medical" | "accident" | "disaster" | "health_records" | "safety" | "general",
  "title": "Brief, clear title of the situation",
  "summary": "2-3 sentence description of what was detected and the overall assessment",
  "actions": [
    {
      "priority": 1,
      "action": "Clear, actionable step",
      "details": "Additional details for this step",
      "timeframe": "Immediately" | "Within 1 hour" | "Today" | "This week",
      "type": "emergency" | "medical" | "navigation" | "communication" | "prevention" | "information"
    }
  ],
  "emergency_contacts": [
    {
      "name": "Service name",
      "number": "Phone number",
      "relevance": "Why this contact is relevant"
    }
  ],
  "key_findings": [
    {
      "finding": "Important extracted detail",
      "confidence": "high" | "medium" | "low",
      "source": "Where this info was derived from"
    }
  ],
  "warnings": ["Any critical warnings or things to avoid"],
  "follow_up": ["Recommended follow-up actions after the immediate situation is handled"],
  "location_relevant": true | false,
  "search_queries": ["Suggested search queries for verification"]
}

RULES:
- Always prioritize human safety above all else
- For medical situations, ALWAYS include "Call emergency services" as the first action if severity is critical
- Include India-specific emergency numbers: 112 (universal), 102 (ambulance), 100 (police), 101 (fire)
- Be specific and actionable — avoid vague advice
- If the input contains a photo/image, describe what you see and assess accordingly
- For medical prescriptions, extract drug names, dosages, and flag any potential interactions
- For accident reports, provide first aid steps AND emergency navigation
- Always include a confidence level for your assessment
- Respond ONLY with valid JSON — no markdown, no code fences, no explanation text`;

/**
 * Gemini response schema for structured JSON output enforcement.
 * This schema is used by Gemini to validate and constrain the output format,
 * ensuring responses are always well-structured and parsable.
 *
 * @type {Object}
 */
const TRIAGE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    severity: {
      type: 'string',
      enum: ['critical', 'urgent', 'normal'],
      description: 'Urgency level of the situation',
    },
    category: {
      type: 'string',
      enum: ['medical', 'accident', 'disaster', 'health_records', 'safety', 'general'],
      description: 'Category of the incident or query',
    },
    title: { type: 'string', description: 'Brief title of the situation' },
    summary: { type: 'string', description: '2-3 sentence assessment summary' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer', description: 'Action priority (1 = highest)' },
          action: { type: 'string', description: 'Clear, actionable step' },
          details: { type: 'string', description: 'Additional details' },
          timeframe: { type: 'string', description: 'When to perform this action' },
          type: {
            type: 'string',
            enum: ['emergency', 'medical', 'navigation', 'communication', 'prevention', 'information'],
          },
        },
        required: ['priority', 'action', 'details', 'timeframe', 'type'],
      },
    },
    emergency_contacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          number: { type: 'string' },
          relevance: { type: 'string' },
        },
        required: ['name', 'number', 'relevance'],
      },
    },
    key_findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          finding: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          source: { type: 'string' },
        },
        required: ['finding', 'confidence', 'source'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
    follow_up: { type: 'array', items: { type: 'string' } },
    location_relevant: { type: 'boolean' },
    search_queries: { type: 'array', items: { type: 'string' } },
  },
  required: ['severity', 'category', 'title', 'summary', 'actions', 'emergency_contacts', 'key_findings', 'warnings', 'follow_up', 'location_relevant', 'search_queries'],
};

/**
 * Process input through Google Gemini AI with multimodal support.
 * Uses Gemini 2.0 Flash for fast, efficient processing with structured JSON output.
 *
 * Supports text, image (base64), and combined multimodal inputs.
 * Uses response schema enforcement to guarantee valid JSON output.
 *
 * @param {Object} input - Input data for Gemini processing
 * @param {string} [input.text] - Text input to analyze
 * @param {string} [input.image] - Base64 encoded image data
 * @param {string} [input.inputType='text'] - Input type (text, voice, camera, file)
 * @returns {Promise<Object>} Structured triage response conforming to TRIAGE_RESPONSE_SCHEMA
 * @throws {Error} When Gemini API fails or returns unparsable response
 */
export async function processWithGemini({ text, image, inputType }) {
  try {
    const parts = [];

    // Add text content
    if (text) {
      parts.push({ text: buildPrompt(text, inputType) });
    }

    // Add image content if present (multimodal input)
    if (image) {
      // Image should be base64 encoded
      const imageData = image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: detectMimeType(image),
          data: imageData,
        },
      });

      if (!text) {
        parts.push({
          text: 'Analyze this image thoroughly. Identify any emergency, medical, safety, or actionable information. Provide a complete triage assessment.',
        });
      }
    }

    // Call Gemini API with structured output schema
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: TRIAGE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: TRIAGE_RESPONSE_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 4096,
        topP: 0.8,
      },
    });

    const responseText = response.text.trim();

    // Parse JSON response — structured output should be valid JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback: try extracting JSON from markdown code block
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Last resort: find JSON object in text
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse Gemini response as JSON');
        }
      }
    }

    return parsed;
  } catch (error) {
    if (error.status === 429) {
      console.error('Gemini API Quota Exceeded (429). Please wait for quota to reset or use a different key.');
    } else {
      console.error('Gemini processing error:', error);
    }
    throw error;
  }
}

/**
 * Verify claims using Google Search grounding through Gemini.
 * Cross-checks triage findings against live web data for accuracy.
 *
 * Uses Gemini's built-in Google Search tool to perform grounded verification,
 * returning confidence scores and source references.
 *
 * @param {string[]} queries - Array of claims/queries to verify (max 3 processed)
 * @returns {Promise<Object[]>} Array of verification results with confidence scores
 */
export async function verifyWithGrounding(queries) {
  try {
    if (!queries || queries.length === 0) return [];

    const verifications = [];

    for (const query of queries.slice(0, 3)) {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Verify this claim and provide a factual assessment with sources: "${query}". Respond with JSON: {"claim": "${query}", "verified": true|false|"partially", "confidence": 0.0-1.0, "summary": "brief verification result", "sources": ["source names"]}`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text.trim();
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          verifications.push(JSON.parse(jsonMatch[0]));
        }
      } catch {
        verifications.push({
          claim: query,
          verified: 'unknown',
          confidence: 0,
          summary: 'Verification could not be completed',
          sources: [],
        });
      }
    }

    return verifications;
  } catch (error) {
    console.error('Grounding verification error:', error);
    return [];
  }
}

/**
 * Build a context-aware prompt based on input type.
 * Adds appropriate framing for voice, camera, file, or text inputs.
 *
 * @param {string} text - Raw text input from the user
 * @param {string} inputType - Type of input (voice, camera, file, text)
 * @returns {string} Formatted prompt with context prefix
 */
function buildPrompt(text, inputType) {
  const typeContext = {
    voice:
      'The following was transcribed from voice input. The person may be in distress. Analyze carefully for urgency:',
    camera:
      'The following image was captured live. Analyze everything visible for emergency, safety, or actionable information:',
    file: 'The following content was extracted from an uploaded document. Process it for structured actionable information:',
    text: 'Analyze the following input and provide a complete triage assessment:',
  };

  return `${typeContext[inputType] || typeContext.text}\n\n"${text}"`;
}

/**
 * Detect MIME type from a base64 data URL string.
 *
 * @param {string} base64String - Base64 encoded data URL or raw base64
 * @returns {string} Detected MIME type (defaults to 'image/jpeg')
 */
function detectMimeType(base64String) {
  if (base64String.startsWith('data:')) {
    const match = base64String.match(/data:([^;]+);/);
    return match ? match[1] : 'image/jpeg';
  }
  return 'image/jpeg';
}
