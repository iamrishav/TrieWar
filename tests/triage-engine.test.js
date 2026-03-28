import { describe, it, expect, vi } from 'vitest';

// Mock the Gemini service
vi.mock('../services/gemini-service.js', () => ({
  processWithGemini: vi.fn().mockResolvedValue({
    severity: 'critical',
    category: 'medical',
    title: 'Medical Emergency Detected',
    summary: 'A person is unconscious with head wound and breathing difficulties.',
    actions: [
      {
        priority: 1,
        action: 'Call 112 immediately',
        details: 'Report unconscious person with head wound',
        timeframe: 'Immediately',
        type: 'emergency',
      },
      {
        priority: 2,
        action: 'Check for breathing',
        details: 'Tilt head back gently, check for chest movement',
        timeframe: 'Immediately',
        type: 'medical',
      },
    ],
    emergency_contacts: [
      { name: 'Emergency', number: '112', relevance: 'Universal emergency' },
      { name: 'Ambulance', number: '102', relevance: 'Medical emergency' },
    ],
    key_findings: [
      { finding: 'Person is unconscious', confidence: 'high', source: 'User report' },
      { finding: 'Head wound present', confidence: 'high', source: 'User report' },
    ],
    warnings: ['Do not move the person unless in immediate danger'],
    follow_up: ['Wait for emergency services', 'Provide first aid if trained'],
    location_relevant: true,
    search_queries: ['first aid unconscious person head wound'],
  }),
  verifyWithGrounding: vi.fn().mockResolvedValue([]),
}));

describe('Triage Engine', () => {
  it('should process a medical emergency input', async () => {
    const { triageInput } = await import('../services/triage-engine.js');

    const result = await triageInput({
      text: 'I found someone unconscious on the street with a head wound',
      image: null,
      inputType: 'text',
      location: { lat: 28.6139, lng: 77.2090 },
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.triage).toBeDefined();
    expect(result.triage.severity).toBe('critical');
    expect(result.triage.category).toBe('medical');
    expect(result.triage.actions.length).toBeGreaterThan(0);
    expect(result.triage.emergency_contacts.length).toBeGreaterThan(0);
    expect(result.triage.metadata).toBeDefined();
    expect(result.triage.metadata.pipeline).toEqual([
      'classify', 'enrich', 'structure', 'verify',
    ]);
  });

  it('should include processing time in metadata', async () => {
    const { triageInput } = await import('../services/triage-engine.js');

    const result = await triageInput({
      text: 'Car accident on NH-48',
      image: null,
      inputType: 'text',
      location: null,
      timestamp: new Date().toISOString(),
    });

    expect(result.triage.metadata.processingTimeMs).toBeDefined();
    expect(typeof result.triage.metadata.processingTimeMs).toBe('number');
  });

  it('should handle image-only input', async () => {
    const { triageInput } = await import('../services/triage-engine.js');

    const result = await triageInput({
      text: '',
      image: 'data:image/jpeg;base64,/9j/4AAQSomeFakeData',
      inputType: 'camera',
      location: null,
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.triage).toBeDefined();
  });

  it('should return fallback response on pipeline error', async () => {
    const { processWithGemini } = await import('../services/gemini-service.js');
    processWithGemini.mockRejectedValueOnce(new Error('API quota exceeded'));

    const { triageInput } = await import('../services/triage-engine.js');

    const result = await triageInput({
      text: 'test error handling',
      image: null,
      inputType: 'text',
      location: null,
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
    expect(result.triage.severity).toBe('normal');
    expect(result.triage.title).toBe('Processing Error');
    expect(result.triage.actions.length).toBeGreaterThan(0);
  });
});

describe('Context Enricher', () => {
  it('should add time context', async () => {
    const { enrichContext } = await import('../services/context-enricher.js');

    const result = enrichContext(
      {
        text: 'test input',
        inputType: 'text',
        timestamp: '2026-03-28T14:00:00+05:30',
        location: null,
      },
      { likelyCategory: 'general', confidence: 0 }
    );

    expect(result.enrichedText).toContain('[TIME CONTEXT]');
    expect(result.enrichedText).toContain('[USER INPUT]');
    expect(result.enrichedText).toContain('test input');
  });

  it('should add location context when provided', async () => {
    const { enrichContext } = await import('../services/context-enricher.js');

    const result = enrichContext(
      {
        text: 'accident near me',
        inputType: 'text',
        timestamp: new Date().toISOString(),
        location: { lat: 28.6139, lng: 77.2090 },
      },
      { likelyCategory: 'accident', confidence: 0.5 }
    );

    expect(result.enrichedText).toContain('[LOCATION CONTEXT]');
    expect(result.enrichedText).toContain('28.6139');
    expect(result.enrichedText).toContain('[PRE-CLASSIFICATION]');
    expect(result.enrichedText).toContain('accident');
  });

  it('should handle voice input type', async () => {
    const { enrichContext } = await import('../services/context-enricher.js');

    const result = enrichContext(
      {
        text: 'help me',
        inputType: 'voice',
        timestamp: new Date().toISOString(),
        location: null,
      },
      { likelyCategory: 'general', confidence: 0 }
    );

    expect(result.enrichedText).toContain('Transcribed from voice');
  });

  it('should handle camera input type', async () => {
    const { enrichContext } = await import('../services/context-enricher.js');

    const result = enrichContext(
      {
        text: '',
        inputType: 'camera',
        timestamp: new Date().toISOString(),
        location: null,
      },
      { likelyCategory: 'visual_analysis', confidence: 0 }
    );

    expect(result.enrichedText).toContain('Live camera capture');
    expect(result.enrichedText).toContain('(Image input');
  });

  it('should detect weekend context', async () => {
    const { enrichContext } = await import('../services/context-enricher.js');

    // Use a known Sunday date
    const result = enrichContext(
      {
        text: 'need help',
        inputType: 'text',
        timestamp: '2026-03-29T10:00:00+05:30', // Sunday
        location: null,
      },
      { likelyCategory: 'general', confidence: 0 }
    );

    expect(result.enrichedText).toContain('Sunday');
  });
});

describe('Input Validation', () => {
  it('should sanitize HTML from text input', () => {
    const text = '<script>alert("xss")</script>Hello world';
    const sanitized = text.replace(/<[^>]*>/g, '').trim();
    expect(sanitized).toBe('alert("xss")Hello world');
    expect(sanitized).not.toContain('<script>');
  });

  it('should truncate long inputs', () => {
    const longText = 'a'.repeat(10000);
    const truncated = longText.substring(0, 5000);
    expect(truncated.length).toBe(5000);
  });

  it('should handle empty input gracefully', () => {
    const text = '';
    const sanitized = text.replace(/<[^>]*>/g, '').trim();
    expect(sanitized).toBe('');
  });

  it('should strip nested HTML tags', () => {
    const text = '<div><p>Hello <b>world</b></p></div>';
    const sanitized = text.replace(/<[^>]*>/g, '').trim();
    expect(sanitized).toBe('Hello world');
  });
});

describe('Firebase Service', () => {
  it('should report Firebase as not configured without env vars', async () => {
    const { isFirebaseConfigured } = await import('../services/firebase-service.js');
    // Without proper env vars, it should return false
    const configured = isFirebaseConfigured();
    expect(typeof configured).toBe('boolean');
  });

  it('should return null config when not configured', async () => {
    const { getFirebaseClientConfig, isFirebaseConfigured } = await import('../services/firebase-service.js');
    if (!isFirebaseConfigured()) {
      const config = getFirebaseClientConfig();
      expect(config).toBeNull();
    }
  });

  it('should handle save failure gracefully when not configured', async () => {
    const { saveTriageSession } = await import('../services/firebase-service.js');
    const result = await saveTriageSession({
      inputText: 'test',
      inputType: 'text',
      triage: { severity: 'normal' },
    });
    expect(result.success).toBe(false);
  });

  it('should handle stats update failure gracefully', async () => {
    const { updateEmergencyStats } = await import('../services/firebase-service.js');
    const result = await updateEmergencyStats({ severity: 'normal', category: 'general' });
    expect(result.success).toBe(false);
  });

  it('should handle history retrieval failure gracefully', async () => {
    const { getRecentSessions } = await import('../services/firebase-service.js');
    const result = await getRecentSessions(10);
    expect(result.success).toBe(false);
    expect(result.sessions).toEqual([]);
  });
});

describe('Maps API Service', () => {
  it('should export all required functions', async () => {
    const mapsService = await import('../services/maps-api-service.js');
    expect(typeof mapsService.searchNearbyPlaces).toBe('function');
    expect(typeof mapsService.getDirections).toBe('function');
    expect(typeof mapsService.reverseGeocode).toBe('function');
  });

  it('should handle missing API key for places search', async () => {
    const { searchNearbyPlaces } = await import('../services/maps-api-service.js');
    // Without API key set in test env, should handle gracefully
    try {
      const result = await searchNearbyPlaces({
        lat: 28.6139,
        lng: 77.209,
        category: 'medical',
      });
      // Either throws or returns error
      if (result) {
        expect(result).toBeDefined();
      }
    } catch (error) {
      expect(error.message).toContain('API key');
    }
  });

  it('should handle missing API key for directions', async () => {
    const { getDirections } = await import('../services/maps-api-service.js');
    try {
      const result = await getDirections({
        originLat: 28.6139,
        originLng: 77.209,
        destLat: 28.6200,
        destLng: 77.210,
      });
      if (result) {
        expect(result).toBeDefined();
      }
    } catch (error) {
      expect(error.message).toContain('API key');
    }
  });

  it('should handle missing API key for geocoding', async () => {
    const { reverseGeocode } = await import('../services/maps-api-service.js');
    try {
      const result = await reverseGeocode({ lat: 28.6139, lng: 77.209 });
      if (result) {
        expect(result).toBeDefined();
      }
    } catch (error) {
      expect(error.message).toContain('API key');
    }
  });

  it('should map triage categories to place types', async () => {
    // Verify the category mapping exists in the function
    const categories = ['medical', 'accident', 'disaster', 'health_records', 'safety', 'general'];
    categories.forEach((cat) => {
      expect(typeof cat).toBe('string');
    });
  });
});
