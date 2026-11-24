/**
 * Tests for src/api/client.ts
 *
 * Covers:
 * 1. Request interceptor attaches Authorization header from sessionStorage via getToken()
 * 2. 401 response interceptor clears token and redirects to /login (unless already there)
 * 3. setConfig resets the cached client instance (_clientInstance = null)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import axios from "axios";

// ---------------------------------------------------------------------------
// Module-level mock for axios so we can intercept axios.create() calls.
// We need to capture the interceptors that client.ts registers so we can
// invoke them directly in tests.
// ---------------------------------------------------------------------------
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();

  // Interceptor stores – populated each time axios.create() is called.
  let requestFulfilled: ((cfg: unknown) => unknown) | null = null;
  let responseRejected: ((err: unknown) => unknown) | null = null;

  const mockInstance = {
    interceptors: {
      request: {
        use: vi.fn((fulfilled) => {
          requestFulfilled = fulfilled;
        }),
      },
      response: {
        use: vi.fn((_fulfilled, rejected) => {
          responseRejected = rejected;
        }),
      },
    },
    // Expose handles so tests can reach the registered handlers.
    _getRequestHandler: () => requestFulfilled,
    _getResponseRejectHandler: () => responseRejected,
  };

  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => {
        // Reset handler captures for each new instance.
        requestFulfilled = null;
        responseRejected = null;
        return mockInstance;
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// After mocking axios we can safely import the module under test.
// Each test that needs a fresh singleton calls resetClient() + re-imports
// helpers from client.ts via normal imports.
// ---------------------------------------------------------------------------
import {
  getToken,
  setToken,
  clearToken,
  getApiClient,
  setConfig,
  resetClient,
} from "./client";

// ---------------------------------------------------------------------------
// Helpers to reach the interceptor handlers registered on the mock instance.
// ---------------------------------------------------------------------------
function getMockInstance() {
  // axios.create is mocked; its last return value is the mock instance.
  const createSpy = (axios.create as ReturnType<typeof vi.fn>);
  // The mock create always returns the same mockInstance reference.
  return createSpy.mock.results[createSpy.mock.results.length - 1]?.value as {
    _getRequestHandler: () => ((cfg: unknown) => unknown) | null;
    _getResponseRejectHandler: () => ((err: unknown) => unknown) | null;
    interceptors: {
      request: { use: ReturnType<typeof vi.fn> };
      response: { use: ReturnType<typeof vi.fn> };
    };
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("api/client", () => {
  // Spy on sessionStorage and localStorage before each test.
  let sessionGetSpy: ReturnType<typeof vi.spyOn>;
  let sessionSetSpy: ReturnType<typeof vi.spyOn>;
  let sessionRemoveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Ensure a fresh singleton for every test.
    resetClient();
    // Clear any stored values.
    sessionStorage.clear();
    localStorage.clear();

    sessionGetSpy = vi.spyOn(sessionStorage, "getItem");
    sessionSetSpy = vi.spyOn(sessionStorage, "setItem");
    sessionRemoveSpy = vi.spyOn(sessionStorage, "removeItem");

    // Reset window.location to a non-login path so redirect tests are meaningful.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { pathname: "/dashboard", href: "/dashboard" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Token helpers
  // -------------------------------------------------------------------------
  describe("token helpers", () => {
    it("getToken returns null when nothing is stored", () => {
      expect(getToken()).toBeNull();
    });

    it("setToken persists the token in sessionStorage", () => {
      setToken("tok-abc");
      expect(sessionStorage.getItem("rancherhub_token")).toBe("tok-abc");
    });

    it("clearToken removes the token from sessionStorage", () => {
      setToken("tok-xyz");
      clearToken();
      expect(sessionStorage.getItem("rancherhub_token")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Request interceptor – Authorization header injection
  // -------------------------------------------------------------------------
  describe("request interceptor", () => {
    it("attaches Bearer token when getToken() returns a value", () => {
      sessionStorage.setItem("rancherhub_token", "my-token");

      // Calling getApiClient() triggers axios.create() + interceptor registration.
      getApiClient();
      const instance = getMockInstance();
      const requestHandler = instance._getRequestHandler();

      expect(requestHandler).toBeTruthy();

      // Simulate an outgoing request config with a headers object.
      const config: { headers: Record<string, string> } = { headers: {} };
      const result = requestHandler!(config) as typeof config;

      expect(result.headers["Authorization"]).toBe("Bearer my-token");
    });

    it("does NOT attach Authorization when no token is stored", () => {
      // sessionStorage is already cleared in beforeEach.
      getApiClient();
      const instance = getMockInstance();
      const requestHandler = instance._getRequestHandler();

      const config: { headers: Record<string, string> } = { headers: {} };
      const result = requestHandler!(config) as typeof config;

      expect(result.headers["Authorization"]).toBeUndefined();
    });

    it("handles missing headers object gracefully (no crash)", () => {
      sessionStorage.setItem("rancherhub_token", "tok");
      getApiClient();
      const requestHandler = getMockInstance()._getRequestHandler();

      // headers is falsy – should still return the config unchanged.
      const config = { headers: null };
      expect(() => requestHandler!(config)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Response interceptor – 401 handling
  // -------------------------------------------------------------------------
  describe("response interceptor – 401 handling", () => {
    it("clears the token on a 401 response", async () => {
      sessionStorage.setItem("rancherhub_token", "stale-token");
      getApiClient();
      const rejectHandler = getMockInstance()._getResponseRejectHandler();

      const error = { response: { status: 401 } };
      await expect(rejectHandler!(error)).rejects.toEqual(error);

      expect(sessionStorage.getItem("rancherhub_token")).toBeNull();
    });

    it("redirects to /login on 401 when not already on /login", async () => {
      // pathname is /dashboard (set in beforeEach).
      getApiClient();
      const rejectHandler = getMockInstance()._getResponseRejectHandler();

      const error = { response: { status: 401 } };
      await expect(rejectHandler!(error)).rejects.toBeDefined();

      expect(window.location.href).toBe("/login");
    });

    it("does NOT redirect when already on /login", async () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        writable: true,
        value: { pathname: "/login", href: "/login" },
      });

      getApiClient();
      const rejectHandler = getMockInstance()._getResponseRejectHandler();

      const error = { response: { status: 401 } };
      await expect(rejectHandler!(error)).rejects.toBeDefined();

      // href must remain /login – no second redirect.
      expect(window.location.href).toBe("/login");
    });

    it("re-rejects the error so callers can handle it", async () => {
      getApiClient();
      const rejectHandler = getMockInstance()._getResponseRejectHandler();

      const error = { response: { status: 401 } };
      await expect(rejectHandler!(error)).rejects.toEqual(error);
    });

    it("passes non-401 errors through without side-effects", async () => {
      sessionStorage.setItem("rancherhub_token", "valid-token");
      getApiClient();
      const rejectHandler = getMockInstance()._getResponseRejectHandler();

      const error = { response: { status: 500 } };
      await expect(rejectHandler!(error)).rejects.toEqual(error);

      // Token must still be present.
      expect(sessionStorage.getItem("rancherhub_token")).toBe("valid-token");
    });
  });

  // -------------------------------------------------------------------------
  // setConfig resets the cached singleton
  // -------------------------------------------------------------------------
  describe("setConfig", () => {
    it("resets the cached client instance so the next call creates a new one", () => {
      const createSpy = axios.create as ReturnType<typeof vi.fn>;
      createSpy.mockClear();

      // First call creates instance (count = 1).
      getApiClient();
      expect(createSpy).toHaveBeenCalledTimes(1);

      // setConfig should null out _clientInstance.
      setConfig({ baseURL: "https://new.host.example" });

      // Second call must create a new instance (count = 2).
      getApiClient();
      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    it("persists config to localStorage", () => {
      setConfig({ baseURL: "https://cfg-host.example" });
      const stored = JSON.parse(localStorage.getItem("rancherhub_config")!);
      expect(stored.baseURL).toBe("https://cfg-host.example");
    });
  });

  // -------------------------------------------------------------------------
  // Singleton caching
  // -------------------------------------------------------------------------
  describe("singleton caching", () => {
    it("returns the same instance on repeated calls without resetClient()", () => {
      const a = getApiClient();
      const b = getApiClient();
      expect(a).toBe(b);
    });

    it("returns a new instance after resetClient()", () => {
      const createSpy = axios.create as ReturnType<typeof vi.fn>;
      createSpy.mockClear();

      getApiClient();
      resetClient();
      getApiClient();

      expect(createSpy).toHaveBeenCalledTimes(2);
    });
  });
});
