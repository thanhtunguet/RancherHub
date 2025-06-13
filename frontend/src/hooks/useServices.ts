import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { servicesApi } from "../services/api";

export const useServices = (
  environmentId?: string, 
  filters?: { type?: string; search?: string }
) => {
  return useQuery({
    queryKey: ["services", environmentId, filters],
    queryFn: () => {
      console.log(
        "useServices: Fetching services for environment:",
        environmentId,
        "with filters:",
        filters
      );
      return servicesApi.getByEnvironment(environmentId!, filters);
    },
    enabled: !!environmentId,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useServicesByAppInstance = (
  appInstanceId?: string,
  filters?: { type?: string; search?: string }
) => {
  return useQuery({
    queryKey: ["services", "app-instance", appInstanceId, filters],
    queryFn: () => {
      console.log(
        "useServicesByAppInstance: Fetching services for app instance:",
        appInstanceId,
        "with filters:",
        filters
      );
      return servicesApi.getByAppInstance(appInstanceId!, filters);
    },
    enabled: !!appInstanceId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useWorkloadTypes = (environmentId?: string) => {
  return useQuery({
    queryKey: ["workload-types", environmentId],
    queryFn: () => {
      console.log("useWorkloadTypes: Fetching workload types for environment:", environmentId);
      return servicesApi.getWorkloadTypes(environmentId!);
    },
    enabled: !!environmentId,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useSyncServices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: servicesApi.sync,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["sync-history"] });

      if (result.status === "completed") {
        message.success("Services synchronized successfully!");
      } else if (result.status === "partial") {
        message.warning("Synchronization completed with some errors");
      } else {
        message.error("Synchronization failed");
      }
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to synchronize services"
      );
    },
  });
};

export const useSyncHistory = (environmentId?: string) => {
  return useQuery({
    queryKey: ["sync-history", environmentId],
    queryFn: () => servicesApi.getSyncHistory(environmentId),
    enabled: !!environmentId,
  });
};
