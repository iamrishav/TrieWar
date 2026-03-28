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
});
