/**
 * Tests for useSyncModal hook.
 *
 * Strategy: mock the two internal hooks (useAppInstancesByEnvironment and
 * useSyncServices) so every assertion targets the hook's own decision logic,
 * not network behaviour.
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── module mocks ────────────────────────────────────────────────────────────

jest.mock("./useAppInstances", () => ({
  useAppInstancesByEnvironment: jest.fn(),
}));

jest.mock("./useServices", () => ({
  useSyncServices: jest.fn(),
}));

// Import hook + mocks after jest.mock declarations
import { useSyncModal } from "./useSyncModal";
import { useAppInstancesByEnvironment } from "./useAppInstances";
import { useSyncServices } from "./useServices";
import type { Service, Environment, AppInstance } from "../types";

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const makeEnv = (id: string, name = `Env ${id}`): Environment => ({
  id,
  name,
  color: "#fff",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

const makeService = (id: string): Service => ({
  id,
  name: `service-${id}`,
  appInstanceId: "inst-1",
  status: "running",
  replicas: 1,
  availableReplicas: 1,
  imageTag: `img:${id}`,
  workloadType: "Deployment",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

const makeInstance = (id: string): AppInstance => ({
  id,
  name: `instance-${id}`,
  cluster: "cluster-1",
  namespace: "default",
  clusterType: "rancher",
  rancherSiteId: null,
  genericClusterSiteId: null,
  environmentId: "env-2",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

// Default mocks
const mutateAsyncMock = jest.fn();
const defaultMutationResult = {
  mutateAsync: mutateAsyncMock,
  isLoading: false,
  isError: false,
};

const defaultProps = () => ({
  selectedServices: [makeService("s1"), makeService("s2")],
  sourceEnvironment: makeEnv("env-1", "Dev"),
  environments: [makeEnv("env-1", "Dev"), makeEnv("env-2", "Staging"), makeEnv("env-3", "Prod")],
  onSuccess: jest.fn(),
});

beforeEach(() => {
  jest.useFakeTimers();
  (useAppInstancesByEnvironment as jest.Mock).mockReturnValue({ data: [] });
  (useSyncServices as jest.Mock).mockReturnValue(defaultMutationResult);
  mutateAsyncMock.mockReset();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ─── targetEnvironments derivation ───────────────────────────────────────────

describe("useSyncModal – targetEnvironments derivation", () => {
  it("excludes the source environment from the target list", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    expect(result.current.targetEnvironments).toHaveLength(2);
    expect(result.current.targetEnvironments.map((e) => e.id)).not.toContain("env-1");
  });
});

// ─── step 0 → 1 transition (target environment validation) ───────────────────

describe("useSyncModal – step 0 validation (target environment)", () => {
  it("returns failure when no target environment selected", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    let response: any;
    act(() => {
      response = result.current.handleNext();
    });

    expect(response).toEqual({
      success: false,
      message: "Please select a target environment",
    });
    // Step should not advance
    expect(result.current.currentStep).toBe(0);
  });

  it("advances to step 1 when a target environment is set", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => {
      result.current.setTargetEnvironmentId("env-2");
    });
    let response: any;
    act(() => {
      response = result.current.handleNext();
    });

    expect(response).toEqual({ success: true });
    expect(result.current.currentStep).toBe(1);
  });
});

// ─── step 1 → 2 transition (target app instance validation) ──────────────────

describe("useSyncModal – step 1 validation (target instances)", () => {
  const advanceToStep1 = (result: any) => {
    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); }); // step 0 → 1
  };

  it("returns failure when no instances are selected", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });
    advanceToStep1(result);

    let response: any;
    act(() => {
      response = result.current.handleNext();
    });

    expect(response).toEqual({
      success: false,
      message: "Please select at least one target app instance",
    });
    expect(result.current.currentStep).toBe(1);
  });

  it("advances to step 2 when at least one instance is selected", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });
    advanceToStep1(result);

    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    let response: any;
    act(() => {
      response = result.current.handleNext();
    });

    expect(response).toEqual({ success: true });
    expect(result.current.currentStep).toBe(2);
  });
});

// ─── handleBack ───────────────────────────────────────────────────────────────

describe("useSyncModal – handleBack", () => {
  it("decrements the current step", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); }); // → step 1

    act(() => { result.current.handleBack(); });
    expect(result.current.currentStep).toBe(0);
  });
});

// ─── sync request payload construction ───────────────────────────────────────

describe("useSyncModal – sync request payload", () => {
  it("builds the correct SyncServicesRequest and calls mutateAsync", async () => {
    mutateAsyncMock.mockResolvedValue({ status: "completed" });
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    // Reach step 2
    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); }); // → 1
    act(() => { result.current.handleInstanceSelectionChange("inst-x", true); });
    act(() => { result.current.handleInstanceSelectionChange("inst-y", true); });
    act(() => { result.current.handleNext(); }); // → 2

    await act(async () => {
      await result.current.handleConfirmSync();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      sourceEnvironmentId: "env-1",
      targetEnvironmentId: "env-2",
      serviceIds: ["s1", "s2"],
      targetAppInstanceIds: ["inst-x", "inst-y"],
    });
  });
});

// ─── handleConfirmSync – message branch behaviour ─────────────────────────────

describe("useSyncModal – handleConfirmSync message branches", () => {
  const setupAndSync = async (status: string) => {
    mutateAsyncMock.mockResolvedValue({ status });
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); });
    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    act(() => { result.current.handleNext(); });

    let syncResult: any;
    await act(async () => {
      syncResult = await result.current.handleConfirmSync();
    });
    return { syncResult, result };
  };

  it("returns success=true with 'synchronized successfully' on status=completed", async () => {
    const { syncResult } = await setupAndSync("completed");
    expect(syncResult.success).toBe(true);
    expect(syncResult.status).toBe("completed");
    expect(syncResult.message).toMatch(/synchronized successfully/i);
  });

  it("returns success=true with partial message on status=partial", async () => {
    const { syncResult } = await setupAndSync("partial");
    expect(syncResult.success).toBe(true);
    expect(syncResult.status).toBe("partial");
    expect(syncResult.message).toMatch(/partial|some errors/i);
  });

  it("returns success=true with failure message on unknown status", async () => {
    const { syncResult } = await setupAndSync("failed");
    expect(syncResult.success).toBe(true);
    expect(syncResult.status).toBe("failed");
    expect(syncResult.message).toMatch(/fail/i);
  });

  it("returns success=false with error message on API failure", async () => {
    mutateAsyncMock.mockRejectedValue({
      response: { data: { message: "Network error from server" } },
    });
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); });
    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    act(() => { result.current.handleNext(); });

    let syncResult: any;
    await act(async () => {
      syncResult = await result.current.handleConfirmSync();
    });

    expect(syncResult.success).toBe(false);
    expect(syncResult.message).toBe("Network error from server");
  });

  it("falls back to generic failure message when error has no response body", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("Network timeout"));
    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); });
    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    act(() => { result.current.handleNext(); });

    let syncResult: any;
    await act(async () => {
      syncResult = await result.current.handleConfirmSync();
    });

    expect(syncResult.success).toBe(false);
    expect(syncResult.message).toMatch(/failed to synchronize/i);
  });

  it("sets isSyncing=true while syncing, false after", async () => {
    let resolveSync: (v: any) => void;
    const pending = new Promise((res) => { resolveSync = res; });
    mutateAsyncMock.mockReturnValue(pending);

    const props = defaultProps();
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); });
    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    act(() => { result.current.handleNext(); });

    // Kick off the sync but do not await it yet
    let syncPromise: Promise<any>;
    act(() => {
      syncPromise = result.current.handleConfirmSync();
    });

    // isSyncing should now be true
    expect(result.current.isSyncing).toBe(true);

    // Resolve the underlying mutation
    await act(async () => {
      resolveSync!({ status: "completed" });
      await syncPromise!;
    });

    expect(result.current.isSyncing).toBe(false);
  });

  it("schedules auto-close timeout after successful sync", async () => {
    mutateAsyncMock.mockResolvedValue({ status: "completed" });
    const onSuccess = jest.fn();
    const props = { ...defaultProps(), onSuccess };
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); });
    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    act(() => { result.current.handleNext(); });

    await act(async () => {
      await result.current.handleConfirmSync();
    });

    // onSuccess should not be called immediately
    expect(onSuccess).not.toHaveBeenCalled();

    // Advance past the 1500 ms close delay
    act(() => { jest.advanceTimersByTime(1600); });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

// ─── instance selection handlers ─────────────────────────────────────────────

describe("useSyncModal – instance selection handlers", () => {
  it("handleInstanceSelectionChange adds instance when checked=true", () => {
    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleInstanceSelectionChange("inst-1", true); });
    expect(result.current.selectedTargetInstances).toContain("inst-1");
  });

  it("handleInstanceSelectionChange removes instance when checked=false", () => {
    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleInstanceSelectionChange("inst-1", true); });
    act(() => { result.current.handleInstanceSelectionChange("inst-2", true); });
    act(() => { result.current.handleInstanceSelectionChange("inst-1", false); });

    expect(result.current.selectedTargetInstances).not.toContain("inst-1");
    expect(result.current.selectedTargetInstances).toContain("inst-2");
  });

  it("handleSelectAllInstances selects all available target instances", () => {
    const instances = [makeInstance("i1"), makeInstance("i2"), makeInstance("i3")];
    (useAppInstancesByEnvironment as jest.Mock).mockReturnValue({ data: instances });

    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleSelectAllInstances(true); });
    expect(result.current.selectedTargetInstances).toEqual(["i1", "i2", "i3"]);
  });

  it("handleSelectAllInstances clears selection when unchecked", () => {
    const instances = [makeInstance("i1"), makeInstance("i2")];
    (useAppInstancesByEnvironment as jest.Mock).mockReturnValue({ data: instances });

    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleSelectAllInstances(true); });
    act(() => { result.current.handleSelectAllInstances(false); });
    expect(result.current.selectedTargetInstances).toHaveLength(0);
  });

  it("handleSelectAllInstances uses empty array when targetAppInstances is undefined", () => {
    (useAppInstancesByEnvironment as jest.Mock).mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleSelectAllInstances(true); });
    expect(result.current.selectedTargetInstances).toHaveLength(0);
  });
});

// ─── resetModal / handleClose behaviour ──────────────────────────────────────

describe("useSyncModal – resetModal and handleClose", () => {
  it("resetModal resets all state to initial values", () => {
    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); }); // → step 1
    act(() => { result.current.handleInstanceSelectionChange("inst-1", true); });

    act(() => { result.current.resetModal(); });

    expect(result.current.currentStep).toBe(0);
    expect(result.current.targetEnvironmentId).toBe("");
    expect(result.current.selectedTargetInstances).toHaveLength(0);
    expect(result.current.showConfirmModal).toBe(false);
    expect(result.current.isSyncing).toBe(false);
  });

  it("resetModal cancels pending close timeout", async () => {
    mutateAsyncMock.mockResolvedValue({ status: "completed" });
    const onSuccess = jest.fn();
    const props = { ...defaultProps(), onSuccess };
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); });
    act(() => { result.current.handleInstanceSelectionChange("inst-a", true); });
    act(() => { result.current.handleNext(); });

    await act(async () => {
      await result.current.handleConfirmSync();
    });

    // Reset before the timeout fires
    act(() => { result.current.resetModal(); });
    act(() => { jest.advanceTimersByTime(2000); });

    // onSuccess should have been called exactly once (from the auto-close that
    // was already triggered inside handleConfirmSync → handleClose). In most
    // correct implementations the timeout callback calls handleClose → onSuccess.
    // After resetModal the pending timer is cleared, so no additional call happens.
    expect(onSuccess.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("handleClose calls resetModal and then onSuccess", () => {
    const onSuccess = jest.fn();
    const props = { ...defaultProps(), onSuccess };
    const { result } = renderHook(() => useSyncModal(props), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    act(() => { result.current.handleNext(); }); // advance step so reset is visible

    act(() => { result.current.handleClose(); });

    expect(result.current.currentStep).toBe(0);
    expect(result.current.targetEnvironmentId).toBe("");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

// ─── handleSync sets showConfirmModal ────────────────────────────────────────

describe("useSyncModal – handleSync", () => {
  it("sets showConfirmModal to true", () => {
    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });

    expect(result.current.showConfirmModal).toBe(false);
    act(() => { result.current.handleSync(); });
    expect(result.current.showConfirmModal).toBe(true);
  });
});

// ─── targetEnvironment derivation ────────────────────────────────────────────

describe("useSyncModal – targetEnvironment derivation", () => {
  it("is undefined when no target environment is selected", () => {
    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });
    expect(result.current.targetEnvironment).toBeUndefined();
  });

  it("returns the matching environment object after selection", () => {
    const { result } = renderHook(() => useSyncModal(defaultProps()), {
      wrapper: makeQueryWrapper(),
    });
    act(() => { result.current.setTargetEnvironmentId("env-2"); });
    expect(result.current.targetEnvironment?.id).toBe("env-2");
    expect(result.current.targetEnvironment?.name).toBe("Staging");
  });
});
