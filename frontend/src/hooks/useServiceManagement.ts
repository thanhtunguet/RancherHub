import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import {
  useServices,
  useServicesByAppInstance,
  useSyncHistory,
  useWorkloadTypes,
} from "./useServices";
import { useEnvironments } from "./useEnvironments";
import { useAppInstancesByEnvironment } from "./useAppInstances";
import { useAppStore } from "../stores/useAppStore";
import { servicesApi } from "../services/api";
import type { Service, Environment, AppInstance } from "../types";

export function useServiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppInstanceId, setSelectedAppInstanceId] =
    useState<string>("all");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<string>("");

  const { selectedEnvironment } = useAppStore();
  const { data: environments } = useEnvironments();

  // Use the selected environment from global state as default, or allow manual selection
  const effectiveEnvironmentId =
    selectedEnvironmentId || selectedEnvironment?.id || "";

  // Prepare filters for API calls - only include non-default values
  const apiFilters = {
    ...(searchTerm && { search: searchTerm }),
  };

  // Use different hooks based on whether we're filtering by app instance or not
  const {
    data: servicesByEnvironment,
    isLoading: isLoadingByEnvironment,
    error: errorByEnvironment,
    refetch: refetchByEnvironment,
  } = useServices(effectiveEnvironmentId, apiFilters);

  const {
    data: servicesByAppInstance,
    isLoading: isLoadingByAppInstance,
    error: errorByAppInstance,
    refetch: refetchByAppInstance,
  } = useServicesByAppInstance(
    selectedAppInstanceId === "all" ? undefined : selectedAppInstanceId,
    apiFilters
  );

  const { data: appInstances } = useAppInstancesByEnvironment(
    effectiveEnvironmentId
  );
  const { data: syncHistory, isLoading: historyLoading } = useSyncHistory(
    effectiveEnvironmentId
  );

  // Determine which data and loading states to use
  const services =
    selectedAppInstanceId === "all"
      ? servicesByEnvironment
      : servicesByAppInstance;
  const isLoading =
    selectedAppInstanceId === "all"
      ? isLoadingByEnvironment
      : isLoadingByAppInstance;
  const error =
    selectedAppInstanceId === "all" ? errorByEnvironment : errorByAppInstance;
  const refetch =
    selectedAppInstanceId === "all"
      ? refetchByEnvironment
      : refetchByAppInstance;

  // Force refetch when environment changes
  useEffect(() => {
    if (effectiveEnvironmentId) {
      if (selectedAppInstanceId === "all") {
        refetchByEnvironment();
      } else {
        refetchByAppInstance();
      }
    }
  }, [
    effectiveEnvironmentId,
    selectedAppInstanceId,
    refetchByEnvironment,
    refetchByAppInstance,
  ]);

  // Filter services based on status only (search is handled by backend)
  const filteredServices = useMemo(() => {
    if (!services) return [];

    return services.filter((service) => {
      const matchesStatus =
        statusFilter === "all" ||
        service.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesStatus;
    });
  }, [services, statusFilter]);

  // Get unique statuses for filter
  const availableStatuses = useMemo(() => {
    if (!services) return [];

    const statuses = [...new Set(services.map((s) => s.status))];
    return statuses.sort();
  }, [services]);

  const handleServiceSelectionChange = (
    selectedRowKeys: React.Key[],
    selectedRows: Service[]
  ) => {
    setSelectedServices(selectedRows);
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices([...filteredServices]);
    }
  };

  const handleSync = () => {
    if (selectedServices.length === 0) {
      return;
    }
    setShowSyncModal(true);
  };

  const handleRefresh = () => {
    if (selectedAppInstanceId === "all") {
      refetchByEnvironment();
    } else {
      refetchByAppInstance();
    }
  };

  const handleEnvironmentChange = (environmentId: string) => {
    setSelectedEnvironmentId(environmentId);
    setSelectedAppInstanceId("all"); // Reset app instance filter
    setSelectedServices([]); // Clear selected services when changing environment
  };

  const handleAppInstanceChange = (appInstanceId: string) => {
    setSelectedAppInstanceId(appInstanceId);
    setSelectedServices([]); // Clear selected services when changing app instance filter
  };

  const handleTestApi = async () => {
    if (!selectedAppInstanceId || selectedAppInstanceId === "all") {
      message.warning("Please select an app instance to test API");
      return;
    }

    const appInstance = appInstances?.find(
      (a) => a.id === selectedAppInstanceId
    );
    if (!appInstance) {
      message.warning("Selected app instance not found");
      return;
    }

    try {
      message.loading("Testing Rancher API endpoints...", 0);
      const result = await servicesApi.testApiEndpoints(
        appInstance.rancherSiteId
      );
      message.destroy();

      if (result.success) {
        message.success(`API test successful! ${result.message}`);
      } else {
        message.error(`API test failed: ${result.message}`);
      }
    } catch (error) {
      message.destroy();
      message.error(
        `API test failed: ${(error as any)?.message || "Unknown error"}`
      );
    }
  };

  const handleDebugAppInstances = async () => {
    if (!effectiveEnvironmentId) {
      message.warning("Please select an environment to debug");
      return;
    }

    try {
      message.loading("Fetching app instances debug info...", 0);
      const result = await servicesApi.debugAppInstances(
        effectiveEnvironmentId
      );
      message.destroy();

      message.success("Debug info fetched successfully");
      console.log("App Instances Debug Info:", result);
    } catch (error) {
      message.destroy();
      message.error(
        `Debug failed: ${(error as any)?.message || "Unknown error"}`
      );
    }
  };

  const handleDebugClusters = async () => {
    if (!selectedAppInstanceId || selectedAppInstanceId === "all") {
      message.warning("Please select an app instance to debug clusters");
      return;
    }

    const appInstance = appInstances?.find(
      (a) => a.id === selectedAppInstanceId
    );
    if (!appInstance) {
      message.warning("Selected app instance not found");
      return;
    }

    try {
      message.loading("Fetching clusters debug info...", 0);
      const result = await servicesApi.debugClusters(appInstance.rancherSiteId);
      message.destroy();

      message.success("Clusters debug info fetched successfully");
      console.log("Clusters Debug Info:", result);
    } catch (error) {
      message.destroy();
      message.error(
        `Debug failed: ${(error as any)?.message || "Unknown error"}`
      );
    }
  };

  const selectedEnv = environments?.find(
    (e) => e.id === effectiveEnvironmentId
  );
  const selectedAppInstance = appInstances?.find(
    (a) => a.id === selectedAppInstanceId
  );

  return {
    // State
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedAppInstanceId,
    selectedServices,
    showSyncModal,
    setShowSyncModal,
    showHistory,
    setShowHistory,
    effectiveEnvironmentId,

    // Data
    environments,
    services,
    filteredServices,
    appInstances,
    syncHistory,
    selectedEnv,
    selectedAppInstance,
    availableStatuses,

    // Loading states
    isLoading,
    historyLoading,
    error,

    // Handlers
    handleServiceSelectionChange,
    handleSelectAll,
    handleSync,
    handleRefresh,
    handleEnvironmentChange,
    handleAppInstanceChange,
    handleTestApi,
    handleDebugAppInstances,
    handleDebugClusters,
  };
}
