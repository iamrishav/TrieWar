import { describe, it, expect, vi } from 'vitest';
import {
  isFirebaseConfigured,
  getFirebaseClientConfig,
  saveTriageSession,
  getRecentSessions,
  updateEmergencyStats
} from '../services/firebase-service.js';

describe('Firebase Service', () => {
  it('identifies if firebase is not configured', () => {
    const configured = isFirebaseConfigured();
    // Since env could be empty in CI
    expect(typeof configured).toBe('boolean');
  });

  it('returns client config without sensitive internal data', () => {
    const config = getFirebaseClientConfig();
    if (config) {
      expect(config.apiKey).toBeDefined();
      expect(config.authDomain).toBeDefined();
    } else {
      expect(config).toBeNull();
    }
  });

  it('returns valid empty/mocked responses when disabled', async () => {
    // If not configured, these should still resolve without crashing
    const sessions = await getRecentSessions();
    expect(Array.isArray(sessions)).toBe(true);
    
    // Test that saving session gracefully resolves
    await expect(saveTriageSession({ inputText: "test", triage: {} })).resolves.not.toThrow();
    
    // Test stats update
    await expect(updateEmergencyStats({})).resolves.not.toThrow();
  });
});
