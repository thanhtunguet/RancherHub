import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Service } from "../types";
import { useAppInstancesByEnvironment, useAppInstances } from "./useAppInstances";
import { useEnvironments } from "./useEnvironments";
import { useServices, useServicesByAppInstance } from "./useServices";
import { servicesApi } from "../services/api";

export function useServiceManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppInstanceId, setSelectedAppInstanceId] =
    useState<string>("all");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<string>("all"); // Default to "all" instead of auto-selecting first

  const { data: environments } = useEnvironments();
  const { data: allAppInstances } = useAppInstances();

  // Auto-select first app instance when loaded
  React.useEffect(() => {
    if (selectedAppInstanceId === "all" && allAppInstances && allAppInstances.length > 0) {
      setSelectedAppInstanceId(allAppInstances[0].id);
    }
  }, [selectedAppInstanceId, allAppInstances]);

  // Use the selected environment from local state
  const effectiveEnvironmentId = selectedEnvironmentId === "all" ? undefined : selectedEnvironmentId;

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

  // Fetch app instances for the selected environment (or all if no specific environment)
  const { data: appInstances } = useAppInstancesByEnvironment(
    effectiveEnvironmentId
  );

  // Debug logging for app instances
  console.log("App Instances Debug:", {
    effectiveEnvironmentId,
    appInstancesCount: appInstances?.length || 0,
    appInstances: appInstances?.map((ai) => ({ id: ai.id, name: ai.name })),
  });

  // Create a new hook for fetching services from all environments
  const useServicesFromAllEnvironments = () => {
    return useQuery({
      queryKey: ["services", "all-environments", apiFilters],
      queryFn: async () => {
        if (!environments || environments.length === 0) {
          return [];
        }
        
        // Fetch services from all environments in parallel
        const allServicesPromises = environments.map(env => 
          servicesApi.getByEnvironment(env.id, apiFilters).catch(error => {
            console.warn(`Failed to fetch services for environment ${env.id}:`, error);
            return [];
          })
        );
        
        const allServicesArrays = await Promise.all(allServicesPromises);
        
        // Flatten and combine all services
        const allServices = allServicesArrays.flat();
        
        console.log("Fetched services from all environments:", {
          environmentsCount: environments.length,
          totalServices: allServices.length,
          servicesByEnv: allServicesArrays.map((services, index) => ({
            envId: environments[index].id,
            envName: environments[index].name,
            count: services.length
          }))
        });
        
        return allServices;
      },
      enabled: !!(environments && environments.length > 0 && selectedEnvironmentId === "all"),
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: 2,
    });
  };

  // Use different hooks based on whether we're filtering by specific environment/app instance or showing all
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

  const {
    data: servicesFromAllEnvs,
    isLoading: isLoadingAllEnvs,
    error: errorAllEnvs,
    refetch: refetchAllEnvs,
  } = useServicesFromAllEnvironments();

  // Debug logging for services
  console.log("Services Debug:", {
    selectedEnvironmentId,
    effectiveEnvironmentId,
    selectedAppInstanceId,
    servicesByEnvironmentCount: servicesByEnvironment?.length || 0,
    servicesByAppInstanceCount: servicesByAppInstance?.length || 0,
    servicesFromAllEnvsCount: servicesFromAllEnvs?.length || 0,
    isLoadingByEnvironment,
    isLoadingByAppInstance,
    isLoadingAllEnvs,
  });

  // Determine which data and loading states to use
  let services;
  let isLoadingServices;
  let error;
  let refetch;

  if (selectedEnvironmentId === "all") {
    // Show services from all environments
    if (selectedAppInstanceId === "all") {
      services = servicesFromAllEnvs;
      isLoadingServices = isLoadingAllEnvs;
      error = errorAllEnvs;
      refetch = refetchAllEnvs;
    } else {
      // If specific app instance is selected, use app instance services
      services = servicesByAppInstance;
      isLoadingServices = isLoadingByAppInstance;
      error = errorByAppInstance;
      refetch = refetchByAppInstance;
    }
  } else {
    // Show services from specific environment
    if (selectedAppInstanceId === "all") {
      services = servicesByEnvironment;
      isLoadingServices = isLoadingByEnvironment;
      error = errorByEnvironment;
      refetch = refetchByEnvironment;
    } else {
      services = servicesByAppInstance;
      isLoadingServices = isLoadingByAppInstance;
      error = errorByAppInstance;
      refetch = refetchByAppInstance;
    }
  }

  // Separate loading states
  const isLoadingAppInstances = !environments || !allAppInstances;
  const isInitialLoading = isLoadingAppInstances;

  // Force refetch when environment changes
  React.useEffect(() => {
    console.log("useEffect: Environment or app instance changed", {
      selectedEnvironmentId,
      effectiveEnvironmentId,
      selectedAppInstanceId,
    });

    if (selectedEnvironmentId === "all") {
      if (selectedAppInstanceId === "all") {
        refetchAllEnvs();
      } else {
        refetchByAppInstance();
      }
    } else if (effectiveEnvironmentId) {
      if (selectedAppInstanceId === "all") {
        refetchByEnvironment();
      } else {
        refetchByAppInstance();
      }
    }
  }, [
    selectedEnvironmentId,
    effectiveEnvironmentId,
    selectedAppInstanceId,
    refetchByEnvironment,
    refetchByAppInstance,
    refetchAllEnvs,
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
  const handleServiceSelectionChange = (
    _: React.Key[],
    selectedRows: Service[]
  ) => {
    setSelectedServices(selectedRows);
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices);
    }
  };

  const handleSync = () => {
    if (selectedServices.length > 0 && selectedEnv) {
      setShowSyncModal(true);
    }
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch();
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
    allAppInstances,
    selectedEnv,
    selectedAppInstance,
    availableStatuses,

    // Loading states
    isInitialLoading,
    isLoadingServices,
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
