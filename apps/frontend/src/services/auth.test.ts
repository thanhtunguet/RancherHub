/**
 * Tests for apps/frontend/src/services/auth.ts
 *
 * Mocking strategy: jest.mock('axios') intercepts axios.create() before the
 * service module initialises its `authApi` instance at import time. The mock
 * returns a fake axios instance with controllable get/post methods, plus a
 * working interceptor registry so the service's interceptor setup doesn't
 * throw.
 */

// ---- axios mock (must be defined before any imports) ----------------------

// Track the interceptors registered by the service module so we can invoke
// them directly in tests that verify interceptor behaviour.
const requestInterceptors: Array<(cfg: any) => any> = [];
const responseInterceptors: Array<{ onFulfilled: (r: any) => any; onRejected: (e: any) => any }> = [];

const mockGet = jest.fn();
const mockPost = jest.fn();

const mockAxiosInstance = {
  get: mockGet,
  post: mockPost,
  interceptors: {
    request: {
      use: (onFulfilled: (cfg: any) => any) => {
        requestInterceptors.push(onFulfilled);
      },
    },
    response: {
      use: (onFulfilled: (r: any) => any, onRejected: (e: any) => any) => {
        responseInterceptors.push({ onFulfilled, onRejected });
      },
    },
  },
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance),
    Axios: class {},
  },
}));

// ---- imports (after mock) -------------------------------------------------

import { authService } from '../services/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(data: unknown, status = 200) {
  return { data, status, statusText: 'OK', headers: {}, config: {} };
}

/** Run all registered request interceptors against a base config and return it. */
async function runRequestInterceptors(config: any): Promise<any> {
  let cfg = config;
  for (const handler of requestInterceptors) {
    cfg = await handler(cfg);
  }
  return cfg;
}

/** Run all registered response-error interceptors and return rejection. */
async function runResponseErrorInterceptors(error: any): Promise<never> {
  let lastError = error;
  for (const { onRejected } of responseInterceptors) {
    try {
      await onRejected(error);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  (window.location as any).href = 'http://localhost/';
});

// ---------------------------------------------------------------------------
// Token helpers (synchronous, no network)
// ---------------------------------------------------------------------------

describe('authService – local storage helpers', () => {
  it('setToken stores the token and getToken retrieves it', () => {
    authService.setToken('tok-123');
    expect(authService.getToken()).toBe('tok-123');
  });

  it('getToken returns null when nothing is stored', () => {
    expect(authService.getToken()).toBeNull();
  });

  it('setUser stores serialised user and getUser deserialises it', () => {
    const user = {
      id: 'u1',
      username: 'alice',
      email: 'alice@example.com',
      active: true,
      twoFactorEnabled: false,
      isFirstLogin: false,
    };
    authService.setUser(user);
    expect(authService.getUser()).toEqual(user);
  });

  it('getUser returns null when nothing is stored', () => {
    expect(authService.getUser()).toBeNull();
  });

  it('removeToken clears both auth_token and auth_user', () => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', '{"id":"u1"}');
    authService.removeToken();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Request interceptor — token attachment
// ---------------------------------------------------------------------------

describe('authService – request interceptor (token attachment)', () => {
  it('attaches Authorization: Bearer <token> when auth_token is in localStorage', async () => {
    localStorage.setItem('auth_token', 'my-jwt-token');
    const config: any = { headers: {} };
    const result = await runRequestInterceptors(config);
    expect(result.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('does NOT attach Authorization header when no token is stored', async () => {
    const config: any = { headers: {} };
    const result = await runRequestInterceptors(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Response interceptor — 401 handling
// ---------------------------------------------------------------------------

describe('authService – response interceptor (401 handling)', () => {
  it('clears localStorage and redirects to /login on 401', async () => {
    localStorage.setItem('auth_token', 'old-token');
    localStorage.setItem('auth_user', '{"id":"u1"}');

    const error = { response: { status: 401, data: { message: 'Unauthorized' } } };

    await expect(runResponseErrorInterceptors(error)).rejects.toBeDefined();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect((window.location as any).href).toBe('/login');
  });

  it('does NOT clear localStorage or redirect on 500 errors', async () => {
    localStorage.setItem('auth_token', 'valid-token');
    const error = { response: { status: 500, data: { message: 'Server Error' } } };

    await expect(runResponseErrorInterceptors(error)).rejects.toBeDefined();

    expect(localStorage.getItem('auth_token')).toBe('valid-token');
    expect((window.location as any).href).not.toBe('/login');
  });

  it('does NOT clear localStorage or redirect when there is no response (network error)', async () => {
    localStorage.setItem('auth_token', 'valid-token');
    const error = new Error('Network Error');

    await expect(runResponseErrorInterceptors(error)).rejects.toBeDefined();

    expect(localStorage.getItem('auth_token')).toBe('valid-token');
    expect((window.location as any).href).not.toBe('/login');
  });
});

// ---------------------------------------------------------------------------
// Endpoint wrappers — correct paths, parameters, and returned data
// ---------------------------------------------------------------------------

describe('authService – endpoint wrappers', () => {
  it('login POSTs to /login and returns response.data', async () => {
    const responseData = { access_token: 'abc', user: { id: 'u1', username: 'alice' } };
    mockPost.mockResolvedValueOnce(makeResponse(responseData));

    const result = await authService.login({ username: 'alice', password: 'secret' });

    expect(mockPost).toHaveBeenCalledWith('/login', { username: 'alice', password: 'secret' });
    expect(result).toEqual(responseData);
  });

  it('register POSTs to /register and returns response.data', async () => {
    const user = { id: 'u2', username: 'bob', email: 'bob@x.com', active: true, twoFactorEnabled: false, isFirstLogin: true };
    mockPost.mockResolvedValueOnce(makeResponse(user));

    const result = await authService.register({ username: 'bob', email: 'bob@x.com', password: 'pass' });

    expect(mockPost).toHaveBeenCalledWith('/register', { username: 'bob', email: 'bob@x.com', password: 'pass' });
    expect(result).toEqual(user);
  });

  it('getProfile GETs /profile and returns response.data', async () => {
    const user = { id: 'u1', username: 'alice' };
    mockGet.mockResolvedValueOnce(makeResponse(user));

    const result = await authService.getProfile();

    expect(mockGet).toHaveBeenCalledWith('/profile');
    expect(result).toEqual(user);
  });

  it('setup2FA POSTs to /setup-2fa and returns response.data', async () => {
    const data = { secret: 'S3CR3T', qrCode: 'data:image/png;base64,...' };
    mockPost.mockResolvedValueOnce(makeResponse(data));

    const result = await authService.setup2FA();

    expect(mockPost).toHaveBeenCalledWith('/setup-2fa');
    expect(result).toEqual(data);
  });

  it('verify2FA POSTs to /verify-2fa with token object and returns response.data', async () => {
    const data = { success: true, message: 'OK' };
    mockPost.mockResolvedValueOnce(makeResponse(data));

    const result = await authService.verify2FA({ token: '123456' });

    expect(mockPost).toHaveBeenCalledWith('/verify-2fa', { token: '123456' });
    expect(result).toEqual(data);
  });

  it('disable2FA POSTs to /disable-2fa with token and returns response.data', async () => {
    const data = { success: true, message: 'Disabled' };
    mockPost.mockResolvedValueOnce(makeResponse(data));

    const result = await authService.disable2FA('654321');

    expect(mockPost).toHaveBeenCalledWith('/disable-2fa', { token: '654321' });
    expect(result).toEqual(data);
  });

  it('changePassword POSTs to /change-password with currentPassword and newPassword', async () => {
    const data = { success: true, message: 'Changed' };
    mockPost.mockResolvedValueOnce(makeResponse(data));

    const result = await authService.changePassword('old-pass', 'new-pass');

    expect(mockPost).toHaveBeenCalledWith('/change-password', {
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    });
    expect(result).toEqual(data);
  });
});
