/**
 * jest.env.ts — runs via setupFiles (before Jest globals are installed).
 * Use this for polyfilling global objects that source modules read at import time.
 */

// Make window.location writable so tests can assert on href assignments.
// jsdom sets location as a non-configurable property on older versions;
// overwrite carefully.
try {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      origin: 'http://localhost',
      href: 'http://localhost/',
      assign: () => {},
      replace: () => {},
      reload: () => {},
    },
  });
} catch {
  // Already writable (some jsdom versions) — just patch href
  (window.location as any).href = 'http://localhost/';
}
