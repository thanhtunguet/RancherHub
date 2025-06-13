import React, { useMemo, useState, useEffect } from "react";
import type { Service } from "../types";
import { useAppInstancesByEnvironment } from "./useAppInstances";
import { useEnvironments } from "./useEnvironments";
import { useServices, useServicesByAppInstance } from "./useServices";

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

  const { data: environments } = useEnvironments();

  // Auto-select first environment if not set
  useEffect(() => {
    if (!selectedEnvironmentId && environments && environments.length > 0) {
      setSelectedEnvironmentId(environments[0].id);
    }
  }, [selectedEnvironmentId, environments]);

  // Use the selected environment from local state
  const effectiveEnvironmentId = selectedEnvironmentId;

  // Debug logging
  console.log("useServiceManagement Debug:", {
    selectedEnvironmentId,
    effectiveEnvironmentId,
    selectedAppInstanceId,
    searchTerm,
    statusFilter,
  });

  // Prepare filters for API calls - only include non-default values
  const apiFilters = {
    ...(searchTerm && { search: searchTerm }),
  };

  // Fetch app instances for the selected environment
  const { data: appInstances } = useAppInstancesByEnvironment(
    effectiveEnvironmentId
  );

  // Debug logging for app instances
  console.log("App Instances Debug:", {
    effectiveEnvironmentId,
    appInstancesCount: appInstances?.length || 0,
    appInstances: appInstances?.map((ai) => ({ id: ai.id, name: ai.name })),
  });

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

  // Debug logging for services
  console.log("Services Debug:", {
    effectiveEnvironmentId,
    selectedAppInstanceId,
    servicesByEnvironmentCount: servicesByEnvironment?.length || 0,
    servicesByAppInstanceCount: servicesByAppInstance?.length || 0,
    isLoadingByEnvironment,
    isLoadingByAppInstance,
  });

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
    console.log("useEffect: Environment or app instance changed", {
      effectiveEnvironmentId,
      selectedAppInstanceId,
    });

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

  // Filter services by status
  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (statusFilter === "all") return services;

    return services.filter((service) => {
      switch (statusFilter) {
        case "running":
          return service.status === "running";
        case "stopped":
          return service.status === "stopped";
        case "error":
          return service.status === "error";
        case "pending":
          return service.status === "pending";
        default:
          return true;
      }
    });
  }, [services, statusFilter]);

  // Get available statuses for filter
  const availableStatuses = useMemo(() => {
    if (!services) return [];
    const statuses = new Set(services.map((service) => service.status));
    return Array.from(statuses).sort();
  }, [services]);

  // Handlers
  const handleServiceSelectionChange = (serviceIds: string[]) => {
    const selected =
      services?.filter((service) => serviceIds.includes(service.id)) || [];
    setSelectedServices(selected);
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices);
    }
  };

  const handleSync = () => {
    if (selectedServices.length > 0) {
      setShowSyncModal(true);
    }
  };

  const handleRefresh = () => {
    if (selectedAppInstanceId === "all") {
      refetchByEnvironment();
    } else {
      refetchByAppInstance();
    }
  };

  const handleEnvironmentChange = (environmentId: string) => {
    console.log("Environment changed:", environmentId);
    setSelectedEnvironmentId(environmentId);
    setSelectedAppInstanceId("all"); // Reset app instance filter when environment changes
    setSelectedServices([]); // Clear selected services when changing environment
  };

  const handleAppInstanceChange = (appInstanceId: string) => {
    console.log("App instance changed:", appInstanceId);
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
    selectedEnv,
    selectedAppInstance,
    availableStatuses,

    // Loading states
    isLoading,
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
