/**
 * Tests for src/contexts/auth-context.tsx
 *
 * Covers:
 * 1. No token → isLoading becomes false, user stays unauthenticated
 * 2. Existing token + successful getProfile → authenticated user in state
 * 3. login() with requiresTwoFactor/requires2FA flag → sets requires2FA + tempToken
 * 4. login() with access_token → stores token and refreshes profile
 * 5. logout() → clears auth state and token
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---------------------------------------------------------------------------
// Use vi.hoisted() so the mock factory closures can reference the spy fns
// without a "Cannot access before initialization" error caused by vi.mock hoisting.
// ---------------------------------------------------------------------------
const { mockLogin, mockGetProfile, mockGetToken, mockSetToken, mockClearToken } =
  vi.hoisted(() => ({
    mockLogin: vi.fn(),
    mockGetProfile: vi.fn(),
    mockGetToken: vi.fn<[], string | null>(),
    mockSetToken: vi.fn<[string], void>(),
    mockClearToken: vi.fn<[], void>(),
  }));

vi.mock("../repositories/auth.repository", () => ({
  AuthRepository: {
    login: mockLogin,
    getProfile: mockGetProfile,
  },
}));

vi.mock("../api/client", () => ({
  getToken: mockGetToken,
  setToken: mockSetToken,
  clearToken: mockClearToken,
}));

// Import AFTER mocks are set up.
import { AuthProvider, useAuth } from "./auth-context";
import { ProtectedRoute } from "../components/ProtectedRoute";
import type { UserProfile, AuthResponse } from "../api/types";

// ---------------------------------------------------------------------------
// Helper: a minimal consumer component that renders auth state so we can
// assert on what useAuth() returns.
// ---------------------------------------------------------------------------
function AuthConsumer() {
  const {
    user,
    isAuthenticated,
    isLoading,
    requires2FA,
    tempToken,
    login,
    logout,
  } = useAuth();

  return (
    <div>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="requires2FA">{String(requires2FA)}</span>
      <span data-testid="tempToken">{tempToken ?? "null"}</span>
      <span data-testid="username">{user?.username ?? "none"}</span>
      <button
        data-testid="btn-login"
        onClick={() => login({ username: "u", password: "p" })}
      />
      <button data-testid="btn-logout" onClick={() => logout()} />
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const MOCK_USER: UserProfile = {
  id: "u1",
  username: "alice",
  email: "alice@example.com",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getEl(testId: string) {
  return screen.getByTestId(testId).textContent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. No token → stays unauthenticated
  // -------------------------------------------------------------------------
  describe("no token path", () => {
    it("sets isLoading to false and remains unauthenticated", async () => {
      mockGetToken.mockReturnValue(null);

      renderWithProvider();

      // Initially isLoading may be true; wait for it to settle.
      await waitFor(() => {
        expect(getEl("isLoading")).toBe("false");
      });

      expect(getEl("isAuthenticated")).toBe("false");
      expect(getEl("username")).toBe("none");
      // getProfile should never be called when there is no token.
      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Existing token + successful getProfile → authenticated
  // -------------------------------------------------------------------------
  describe("existing token path", () => {
    it("calls getProfile and sets authenticated user when token exists", async () => {
      mockGetToken.mockReturnValue("saved-token");
      mockGetProfile.mockResolvedValue(MOCK_USER);

      renderWithProvider();

      await waitFor(() => {
        expect(getEl("isLoading")).toBe("false");
      });

      expect(mockGetProfile).toHaveBeenCalledTimes(1);
      expect(getEl("isAuthenticated")).toBe("true");
      expect(getEl("username")).toBe("alice");
    });

    it("falls back to unauthenticated if getProfile rejects", async () => {
      mockGetToken.mockReturnValue("bad-token");
      mockGetProfile.mockRejectedValue(new Error("unauthorized"));

      renderWithProvider();

      await waitFor(() => {
        expect(getEl("isLoading")).toBe("false");
      });

      expect(getEl("isAuthenticated")).toBe("false");
      expect(getEl("username")).toBe("none");
    });
  });

  // -------------------------------------------------------------------------
  // 3. login() with requires2FA / requiresTwoFactor
  // -------------------------------------------------------------------------
  describe("login() – two-factor required path", () => {
    beforeEach(() => {
      // No pre-existing token so the initial effect doesn't fire getProfile.
      mockGetToken.mockReturnValue(null);
    });

    it("sets requires2FA=true and stores tempToken when server returns requires2FA", async () => {
      const response: AuthResponse = {
        requires2FA: true,
        tempToken: "tmp-token-123",
      };
      mockLogin.mockResolvedValue(response);

      renderWithProvider();
      await waitFor(() => expect(getEl("isLoading")).toBe("false"));

      await act(async () => {
        screen.getByTestId("btn-login").click();
      });

      expect(getEl("requires2FA")).toBe("true");
      expect(getEl("tempToken")).toBe("tmp-token-123");
      // Should NOT store a token or call getProfile.
      expect(mockSetToken).not.toHaveBeenCalled();
      expect(mockGetProfile).not.toHaveBeenCalled();
    });

    it("sets requires2FA=true when server returns requiresTwoFactor (alternate field)", async () => {
      const response: AuthResponse = {
        requiresTwoFactor: true,
        tempToken: "tmp-alt-456",
      };
      mockLogin.mockResolvedValue(response);

      renderWithProvider();
      await waitFor(() => expect(getEl("isLoading")).toBe("false"));

      await act(async () => {
        screen.getByTestId("btn-login").click();
      });

      expect(getEl("requires2FA")).toBe("true");
      expect(getEl("tempToken")).toBe("tmp-alt-456");
    });

    it("returns { requires2FA: true, tempToken } from the login() promise", async () => {
      mockLogin.mockResolvedValue({
        requires2FA: true,
        tempToken: "return-me",
      });
      mockGetProfile.mockResolvedValue(MOCK_USER);

      let loginResult: { requires2FA?: boolean; tempToken?: string } = {};

      function Tester() {
        const { login } = useAuth();
        return (
          <button
            data-testid="go"
            onClick={async () => {
              loginResult = await login({ username: "u", password: "p" });
            }}
          />
        );
      }

      render(
        <AuthProvider>
          <Tester />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("go").click();
      });

      expect(loginResult.requires2FA).toBe(true);
      expect(loginResult.tempToken).toBe("return-me");
    });
  });

  // -------------------------------------------------------------------------
  // 4. login() with access_token
  // -------------------------------------------------------------------------
  describe("login() – access_token path", () => {
    beforeEach(() => {
      mockGetToken.mockReturnValue(null);
    });

    it("calls setToken and then refreshProfile on success", async () => {
      mockLogin.mockResolvedValue({ access_token: "brand-new-token" });
      mockGetProfile.mockResolvedValue(MOCK_USER);

      renderWithProvider();
      await waitFor(() => expect(getEl("isLoading")).toBe("false"));

      await act(async () => {
        screen.getByTestId("btn-login").click();
      });

      expect(mockSetToken).toHaveBeenCalledWith("brand-new-token");
      expect(mockGetProfile).toHaveBeenCalledTimes(1);
      expect(getEl("isAuthenticated")).toBe("true");
      expect(getEl("username")).toBe("alice");
    });

    it("returns {} when access_token flow succeeds", async () => {
      mockLogin.mockResolvedValue({ access_token: "t" });
      mockGetProfile.mockResolvedValue(MOCK_USER);

      let result: Record<string, unknown> = { marker: true };

      function Tester() {
        const { login } = useAuth();
        return (
          <button
            data-testid="go"
            onClick={async () => {
              result = await login({ username: "u", password: "p" });
            }}
          />
        );
      }

      render(
        <AuthProvider>
          <Tester />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByTestId("go").click();
      });

      expect(result).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // 5. logout()
  // -------------------------------------------------------------------------
  describe("logout()", () => {
    it("clears auth state and calls clearToken", async () => {
      // Start authenticated.
      mockGetToken.mockReturnValue("existing-token");
      mockGetProfile.mockResolvedValue(MOCK_USER);

      renderWithProvider();
      await waitFor(() => expect(getEl("isAuthenticated")).toBe("true"));

      await act(async () => {
        screen.getByTestId("btn-logout").click();
      });

      expect(mockClearToken).toHaveBeenCalledTimes(1);
      expect(getEl("isAuthenticated")).toBe("false");
      expect(getEl("username")).toBe("none");
      expect(getEl("isLoading")).toBe("false");
      expect(getEl("requires2FA")).toBe("false");
      expect(getEl("tempToken")).toBe("null");
    });
  });

  // -------------------------------------------------------------------------
  // 6. first-login 2FA enforcement
  // -------------------------------------------------------------------------
  describe("ProtectedRoute – first-login 2FA enforcement", () => {
    it("redirects authenticated users without 2FA to the profile page", async () => {
      mockGetToken.mockReturnValue("saved-token");
      mockGetProfile.mockResolvedValue({
        ...MOCK_USER,
        twoFactorEnabled: false,
        isFirstLogin: true,
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <Routes>
              <Route path="/profile" element={<div>Profile page</div>} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div>Dashboard</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Profile page")).toBeInTheDocument();
      });

      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 7. useAuth() guard
  // -------------------------------------------------------------------------
  describe("useAuth() outside AuthProvider", () => {
    it("throws when called outside AuthProvider", () => {
      // Suppress the expected React error boundary console output.
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      function Bare() {
        useAuth();
        return null;
      }

      expect(() => render(<Bare />)).toThrow(
        "useAuth must be used within AuthProvider"
      );

      spy.mockRestore();
    });
  });
});
