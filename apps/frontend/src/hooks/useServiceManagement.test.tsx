/**
 * Tests for useServiceManagement hook.
 *
 * Strategy: mock every imported hook and the servicesApi so no network calls
 * are made.  All assertions target the hook's internal decision logic:
 *   - which data-source branch is chosen (env/app-instance combinations)
 *   - client-side filtering by search term and status
 *   - service selection and select-all behaviour
 *   - sync-modal open condition (env + selected services required)
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── module-level mocks ───────────────────────────────────────────────────────

jest.mock("./useAppInstances", () => ({
  useAppInstances: jest.fn(),
  useAppInstancesByEnvironment: jest.fn(),
}));

jest.mock("./useEnvironments", () => ({
  useEnvironments: jest.fn(),
}));

jest.mock("./useServices", () => ({
  useServices: jest.fn(),
  useServicesByAppInstance: jest.fn(),
}));

jest.mock("../services/api", () => ({
  servicesApi: {
    getByEnvironment: jest.fn(),
    getByAppInstance: jest.fn(),
    sync: jest.fn(),
  },
}));

// Imports come AFTER jest.mock declarations
import { useServiceManagement } from "./useServiceManagement";
import { useAppInstances, useAppInstancesByEnvironment } from "./useAppInstances";
import { useEnvironments } from "./useEnvironments";
import { useServices, useServicesByAppInstance } from "./useServices";
import { servicesApi } from "../services/api";
import type { Service, Environment, AppInstance } from "../types";

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const makeEnv = (id: string, name = `Env-${id}`): Environment => ({
  id,
  name,
  color: "#ccc",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

const makeService = (
  id: string,
  overrides: Partial<Service> = {}
): Service => ({
  id,
  name: `svc-${id}`,
  appInstanceId: "inst-1",
  status: "running",
  replicas: 1,
  availableReplicas: 1,
  imageTag: `img:${id}`,
  workloadType: "Deployment",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeInstance = (id: string, envId = "env-1"): AppInstance => ({
  id,
  name: `inst-${id}`,
  cluster: "cluster-1",
  namespace: "default",
  clusterType: "rancher",
  rancherSiteId: null,
  genericClusterSiteId: null,
  environmentId: envId,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

/** Minimal no-op query result (no data, not loading) */
const emptyQuery = () => ({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
});

/** Query result with a concrete data set */
const dataQuery = (data: any[]) => ({
  data,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
});

// Default mock set – all queries return empty, safe for all test branches
const applyDefaultMocks = () => {
  (useEnvironments as jest.Mock).mockReturnValue(dataQuery([]));
  (useAppInstances as jest.Mock).mockReturnValue(dataQuery([]));
  (useAppInstancesByEnvironment as jest.Mock).mockReturnValue(emptyQuery());
  (useServices as jest.Mock).mockReturnValue(emptyQuery());
  (useServicesByAppInstance as jest.Mock).mockReturnValue(emptyQuery());
  (servicesApi.getByEnvironment as jest.Mock).mockResolvedValue([]);
};

beforeEach(() => {
  applyDefaultMocks();
});

// ─── data-source branch selection ────────────────────────────────────────────

describe("useServiceManagement – data-source branching", () => {
  /**
   * Branch: selectedEnvironmentId==="all" && selectedAppInstanceId==="all"
   * Expected: hook exposes `servicesFromAllEnvs` (from the internal useQuery
   * backed by servicesApi.getByEnvironment for each env).
   * We verify indirectly: with environments loaded and no specific filter, the
   * hook's `services` field should reflect the all-environments query result.
   *
   * Note: because useServicesFromAllEnvironments is defined INSIDE the hook, it
   * calls useQuery directly.  With no environments returned, the query is
   * disabled and `services` remains undefined / empty.  We validate that the
   * hook does NOT use servicesByEnvironment or servicesByAppInstance in this branch.
   */
  it("all-env all-instance branch: useServices is called with undefined environmentId", () => {
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
    (useAppInstances as jest.Mock).mockReturnValue(dataQuery([makeInstance("i1")]));

    renderHook(() => useServiceManagement(), { wrapper: makeQueryWrapper() });

    // When selectedEnvironmentId==="all" and selectedAppInstanceId==="all",
    // useServices is called with undefined (disabled).
    expect(useServices).toHaveBeenCalledWith(
      undefined, // effectiveEnvironmentId
      expect.anything()
    );
  });

  it("specific-env all-instance branch: useServices is called with the environment id", () => {
    const envs = [makeEnv("env-1"), makeEnv("env-2")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));
    (useAppInstances as jest.Mock).mockReturnValue(dataQuery([]));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => {
      result.current.handleEnvironmentChange("env-1");
    });

    expect(useServices).toHaveBeenCalledWith("env-1", expect.anything());
  });

  it("all-env specific-instance branch: services come from useServicesByAppInstance", () => {
    const instances = [makeInstance("i1"), makeInstance("i2")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
    (useAppInstances as jest.Mock).mockReturnValue(dataQuery(instances));

    const svcsByInstance = dataQuery([makeService("s1"), makeService("s2")]);
    (useServicesByAppInstance as jest.Mock).mockReturnValue(svcsByInstance);

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => {
      result.current.handleAppInstanceChange("i1");
    });

    // useServicesByAppInstance should have been invoked with the selected instance id
    expect(useServicesByAppInstance).toHaveBeenCalledWith("i1", expect.anything());
  });

  it("specific-env specific-instance branch: useServicesByAppInstance is invoked with the instance id", () => {
    const envs = [makeEnv("env-1")];
    const instances = [makeInstance("i1")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));
    (useAppInstances as jest.Mock).mockReturnValue(dataQuery(instances));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.handleAppInstanceChange("i1"); });

    expect(useServicesByAppInstance).toHaveBeenCalledWith("i1", expect.anything());
  });
});

// ─── handleEnvironmentChange / handleAppInstanceChange side effects ────────────

describe("useServiceManagement – environment/app-instance change side effects", () => {
  it("handleEnvironmentChange resets selectedAppInstanceId and clears selected services", () => {
    const envs = [makeEnv("env-1"), makeEnv("env-2")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    // Select some services first (via select-all on filteredServices)
    act(() => { result.current.handleSelectAll(); });

    act(() => { result.current.handleEnvironmentChange("env-1"); });

    expect(result.current.selectedServices).toHaveLength(0);
    expect(result.current.selectedAppInstanceId).toBe("all");
  });

  it("handleAppInstanceChange clears selected services", () => {
    const services = [makeService("s1"), makeService("s2")];
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    // Select a service, then change app instance
    act(() => { result.current.handleServiceSelectionChange(["s1"], [services[0]]); });
    expect(result.current.selectedServices).toHaveLength(1);

    act(() => { result.current.handleAppInstanceChange("i99"); });
    expect(result.current.selectedServices).toHaveLength(0);
  });
});

// ─── client-side filtering – search term ──────────────────────────────────────

describe("useServiceManagement – client-side search filtering", () => {
  const services = [
    makeService("s1", { name: "frontend-app", imageTag: "v1.0.0", workloadType: "Deployment" }),
    makeService("s2", { name: "backend-api", imageTag: "v2.0.0", workloadType: "StatefulSet" }),
    makeService("s3", { name: "cache-redis", imageTag: "v3.0.0", workloadType: "Deployment" }),
  ];

  beforeEach(() => {
    // Keep useAppInstances empty so the auto-select effect does NOT switch the
    // branch to servicesByAppInstance.  The data then comes from useServices,
    // which is the specific-env + all-instance branch when an env is selected.
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
    (useAppInstances as jest.Mock).mockReturnValue(dataQuery([]));
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
  });

  it("returns all services when search term is empty", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    // Switch to a specific environment so useServices data is the active branch
    act(() => { result.current.handleEnvironmentChange("env-1"); });

    expect(result.current.filteredServices).toHaveLength(3);
  });

  it("filters by service name (case-insensitive)", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.setSearchTerm("FRONTEND"); });

    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].name).toBe("frontend-app");
  });

  it("filters by imageTag", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.setSearchTerm("v2.0.0"); });

    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].id).toBe("s2");
  });

  it("filters by workloadType", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.setSearchTerm("StatefulSet"); });

    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].id).toBe("s2");
  });

  it("returns empty array when no service matches the search term", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.setSearchTerm("does-not-exist-xyz"); });

    expect(result.current.filteredServices).toHaveLength(0);
  });
});

// ─── client-side filtering – status ───────────────────────────────────────────

describe("useServiceManagement – client-side status filtering", () => {
  const services = [
    makeService("s1", { status: "running" }),
    makeService("s2", { status: "stopped" }),
    makeService("s3", { status: "error" }),
    makeService("s4", { status: "pending" }),
    makeService("s5", { status: "running" }),
  ];

  beforeEach(() => {
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
  });

  const activateEnv = (result: any) => {
    act(() => { result.current.handleEnvironmentChange("env-1"); });
  };

  it("shows all services when statusFilter=all", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    activateEnv(result);
    act(() => { result.current.setStatusFilter("all"); });
    expect(result.current.filteredServices).toHaveLength(5);
  });

  it("shows only running services when statusFilter=running", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    activateEnv(result);
    act(() => { result.current.setStatusFilter("running"); });

    const filtered = result.current.filteredServices;
    expect(filtered.length).toBe(2);
    filtered.forEach((s) => expect(s.status).toBe("running"));
  });

  it("shows only stopped services when statusFilter=stopped", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    activateEnv(result);
    act(() => { result.current.setStatusFilter("stopped"); });
    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].id).toBe("s2");
  });

  it("shows only error services when statusFilter=error", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    activateEnv(result);
    act(() => { result.current.setStatusFilter("error"); });
    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].id).toBe("s3");
  });

  it("shows only pending services when statusFilter=pending", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    activateEnv(result);
    act(() => { result.current.setStatusFilter("pending"); });
    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].id).toBe("s4");
  });

  it("combines search and status filters", () => {
    const combo = [
      makeService("a", { name: "frontend", status: "running" }),
      makeService("b", { name: "backend", status: "running" }),
      makeService("c", { name: "frontend-db", status: "stopped" }),
    ];
    (useServices as jest.Mock).mockReturnValue(dataQuery(combo));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    activateEnv(result);

    act(() => { result.current.setSearchTerm("frontend"); });
    act(() => { result.current.setStatusFilter("running"); });

    expect(result.current.filteredServices).toHaveLength(1);
    expect(result.current.filteredServices[0].id).toBe("a");
  });
});

// ─── availableStatuses ────────────────────────────────────────────────────────

describe("useServiceManagement – availableStatuses", () => {
  it("returns a sorted unique set of statuses from all services", () => {
    const services = [
      makeService("s1", { status: "running" }),
      makeService("s2", { status: "stopped" }),
      makeService("s3", { status: "running" }),
      makeService("s4", { status: "error" }),
    ];
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });

    // The statuses from all services (not just filtered), sorted alphabetically
    expect(result.current.availableStatuses).toEqual(["error", "running", "stopped"]);
  });
});

// ─── service selection ────────────────────────────────────────────────────────

describe("useServiceManagement – service selection", () => {
  const services = [makeService("s1"), makeService("s2"), makeService("s3")];

  beforeEach(() => {
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
  });

  it("handleServiceSelectionChange updates selectedServices", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => {
      result.current.handleServiceSelectionChange(["s1", "s2"], [services[0], services[1]]);
    });

    expect(result.current.selectedServices).toHaveLength(2);
    expect(result.current.selectedServices.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("handleServiceSelectionChange with empty arrays clears selection", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => {
      result.current.handleServiceSelectionChange(["s1"], [services[0]]);
    });
    act(() => {
      result.current.handleServiceSelectionChange([], []);
    });

    expect(result.current.selectedServices).toHaveLength(0);
  });
});

// ─── select-all behaviour ─────────────────────────────────────────────────────

describe("useServiceManagement – handleSelectAll", () => {
  const services = [makeService("s1"), makeService("s2"), makeService("s3")];

  beforeEach(() => {
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
  });

  it("selects all filteredServices when none are currently selected", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.handleSelectAll(); });

    expect(result.current.selectedServices).toHaveLength(3);
  });

  it("clears all selections when all filteredServices are already selected", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    // Select all first
    act(() => { result.current.handleSelectAll(); });
    expect(result.current.selectedServices).toHaveLength(3);

    // Toggle off
    act(() => { result.current.handleSelectAll(); });
    expect(result.current.selectedServices).toHaveLength(0);
  });

  it("selects all when only a subset is currently selected", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => {
      result.current.handleServiceSelectionChange(["s1"], [services[0]]);
    });

    // handleSelectAll should select all because not all are selected
    act(() => { result.current.handleSelectAll(); });
    expect(result.current.selectedServices).toHaveLength(3);
  });
});

// ─── handleSync – sync modal open condition ───────────────────────────────────

describe("useServiceManagement – handleSync open condition", () => {
  it("does NOT open sync modal when selectedServices is empty", () => {
    const envs = [makeEnv("env-1")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    // Select a specific environment so selectedEnv is defined
    act(() => { result.current.handleEnvironmentChange("env-1"); });

    // No services selected
    act(() => { result.current.handleSync(); });

    expect(result.current.showSyncModal).toBe(false);
  });

  it("does NOT open sync modal when no specific environment is selected (selectedEnv=undefined)", () => {
    const services = [makeService("s1")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    // Do NOT call handleEnvironmentChange – env stays "all", so selectedEnv is undefined
    act(() => {
      result.current.handleServiceSelectionChange(["s1"], [services[0]]);
    });

    act(() => { result.current.handleSync(); });

    expect(result.current.showSyncModal).toBe(false);
  });

  it("opens sync modal when both a specific environment and selected services are present", () => {
    const envs = [makeEnv("env-1")];
    const services = [makeService("s1"), makeService("s2")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));
    (useAppInstancesByEnvironment as jest.Mock).mockReturnValue(
      dataQuery([makeInstance("i1", "env-1")])
    );

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => {
      result.current.handleServiceSelectionChange(["s1", "s2"], services);
    });

    act(() => { result.current.handleSync(); });

    expect(result.current.showSyncModal).toBe(true);
  });

  it("setShowSyncModal can programmatically close the modal", () => {
    const envs = [makeEnv("env-1")];
    const services = [makeService("s1")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));
    (useServices as jest.Mock).mockReturnValue(dataQuery(services));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => {
      result.current.handleServiceSelectionChange(["s1"], [services[0]]);
    });
    act(() => { result.current.handleSync(); });
    expect(result.current.showSyncModal).toBe(true);

    act(() => { result.current.setShowSyncModal(false); });
    expect(result.current.showSyncModal).toBe(false);
  });
});

// ─── selectedEnv derivation ───────────────────────────────────────────────────

describe("useServiceManagement – selectedEnv derivation", () => {
  it("is undefined when selectedEnvironmentId==='all'", () => {
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery([makeEnv("env-1")]));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    // Default state – no specific env chosen
    expect(result.current.selectedEnv).toBeUndefined();
  });

  it("matches the chosen environment when a specific id is selected", () => {
    const envs = [makeEnv("env-1", "Production"), makeEnv("env-2", "Staging")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-2"); });

    expect(result.current.selectedEnv?.id).toBe("env-2");
    expect(result.current.selectedEnv?.name).toBe("Staging");
  });
});

// ─── handleRefresh ────────────────────────────────────────────────────────────

describe("useServiceManagement – handleRefresh", () => {
  it("calls refetch when invoked", () => {
    const refetchMock = jest.fn();
    const envs = [makeEnv("env-1")];
    (useEnvironments as jest.Mock).mockReturnValue(dataQuery(envs));
    (useServices as jest.Mock).mockReturnValue({
      data: [makeService("s1")],
      isLoading: false,
      error: null,
      refetch: refetchMock,
    });

    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.handleEnvironmentChange("env-1"); });
    act(() => { result.current.handleRefresh(); });

    expect(refetchMock).toHaveBeenCalled();
  });
});

// ─── showHistory toggling ─────────────────────────────────────────────────────

describe("useServiceManagement – showHistory", () => {
  it("defaults to false", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });
    expect(result.current.showHistory).toBe(false);
  });

  it("can be toggled via setShowHistory", () => {
    const { result } = renderHook(() => useServiceManagement(), {
      wrapper: makeQueryWrapper(),
    });

    act(() => { result.current.setShowHistory(true); });
    expect(result.current.showHistory).toBe(true);

    act(() => { result.current.setShowHistory(false); });
    expect(result.current.showHistory).toBe(false);
  });
});
