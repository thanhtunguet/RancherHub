import React, { useMemo, useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import type { Service } from "../types";
import { useAppInstancesByEnvironment } from "./useAppInstances";
import { useEnvironments } from "./useEnvironments";
import {
  useServices,
  useServicesByAppInstance,
  useSyncHistory,
} from "./useServices";

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

  // Force refetch when environment changes
  React.useEffect(() => {
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
    _selectedRowKeys: React.Key[],
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
  };
}
