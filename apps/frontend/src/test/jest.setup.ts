/**
 * jest.setup.ts — runs via setupFilesAfterEnv (jest globals available).
 */

// Silence console.error during tests to keep output clean.
// Individual tests can restore it if they need to assert on errors.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Reset location.href before each test
  (window.location as any).href = 'http://localhost/';
});

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});
