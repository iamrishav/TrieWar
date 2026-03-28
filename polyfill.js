// Polyfill for Node.js < 18 (fetch, Headers, Request, Response)
// Must be imported BEFORE any module that uses fetch or the Gemini SDK.
if (typeof globalThis.fetch === 'undefined' || typeof globalThis.Headers === 'undefined') {
  const nodeFetch = await import('node-fetch');
  globalThis.fetch = globalThis.fetch || nodeFetch.default;
  globalThis.Headers = globalThis.Headers || nodeFetch.Headers;
  globalThis.Request = globalThis.Request || nodeFetch.Request;
  globalThis.Response = globalThis.Response || nodeFetch.Response;
}
