import { describe, it, expect, vi } from 'vitest';
import { generateLocalFallback } from '../services/local-fallback.js';

describe('Local Fallback Engine', () => {
  it('generates a medical emergency fallback correctly', () => {
    const input = { text: 'I cut my arm and bleeding a lot' };
    const classification = { likelyCategory: 'medical' };
    
    const result = generateLocalFallback(input, classification);
    
    expect(result).toBeDefined();
    expect(result.severity).toBe('urgent');
    expect(result.category).toBe('medical');
    expect(result.title).toBe('Pending Medical Attention');
    expect(result.actions).toBeInstanceOf(Array);
    expect(result.actions[0].action).toMatch(/Assess and Monitor/);
  });

  it('generates an accident fallback correctly', () => {
    const input = { text: 'Car crash on highway 9' };
    const classification = { likelyCategory: 'accident' };
    
    const result = generateLocalFallback(input, classification);
    
    expect(result.severity).toBe('urgent');
    expect(result.category).toBe('accident');
    expect(result.title).toBe('Accident Scene Reported');
  });

  it('generates default fallback if category is unknown', () => {
    const input = { text: 'Random text' };
    const classification = { likelyCategory: 'unknown' };
    
    const result = generateLocalFallback(input, classification);
    
    expect(result.severity).toBe('normal');
    expect(result.title).toBe('Information Received');
  });

  it('handles image-only inputs in fallback', () => {
    const input = { image: 'base64...' };
    const classification = { likelyCategory: 'medical' };
    
    const result = generateLocalFallback(input, classification);
    expect(result.summary).toContain('Pending complete analysis');
  });
});
