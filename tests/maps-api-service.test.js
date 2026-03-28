import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchNearbyPlaces, getDirections, reverseGeocode } from '../services/maps-api-service.js';

vi.mock('node-fetch', () => {
  return {
    default: vi.fn((url) => {
      let data = {};
      if (url.includes('nearbysearch')) {
        data = { results: [{ name: 'City Hospital', geometry: { location: { lat: 10, lng: 10 } } }] };
      } else if (url.includes('directions')) {
        data = { routes: [{ legs: [{ distance: { text: '5 km' }, duration: { text: '10 mins' } }] }] };
      } else if (url.includes('geocode')) {
        data = { results: [{ formatted_address: '123 Rescue St' }] };
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
      });
    }),
  };
});

describe('Maps API Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: 'mocked_key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('searches nearby places correctly', async () => {
    const result = await searchNearbyPlaces({ lat: 10, lng: 10, category: 'medical' });
    expect(result.results.length).toBe(1);
    expect(result.results[0].name).toBe('City Hospital');
  });

  it('gets directions correctly', async () => {
    const result = await getDirections({ originLat: 10, originLng: 10, destLat: 11, destLng: 11 });
    expect(result.routes.length).toBe(1);
    expect(result.routes[0].legs[0].duration.text).toBe('10 mins');
  });

  it('reverse geocodes correctly', async () => {
    const result = await reverseGeocode({ lat: 10, lng: 10 });
    expect(result.address).toBe('123 Rescue St');
  });

  it('returns empty place results if missing API Key', async () => {
    process.env.GOOGLE_MAPS_API_KEY = '';
    const result = await searchNearbyPlaces({ lat: 10, lng: 10, category: 'medical' });
    expect(result.results).toBeInstanceOf(Array);
    expect(result.results.length).toBe(0);
  });
});
