import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "../services/api";
import type { SyncServicesRequest } from "../types";

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
      console.log(
        "useWorkloadTypes: Fetching workload types for environment:",
        environmentId
      );
      return servicesApi.getWorkloadTypes(environmentId!);
    },
    enabled: !!environmentId,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export function useSyncServices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (syncRequest: SyncServicesRequest) => {
      const response = await servicesApi.sync(syncRequest);
      return response;
    },
    onSuccess: (data) => {
      // Invalidate and refetch services data
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["syncHistory"] });

      // The success/error messages will be handled by the component using this hook
      return data;
    },
    onError: (error) => {
      // The error will be handled by the component using this hook
      throw error;
    },
  });
}

export const useSyncHistory = (environmentId?: string) => {
  return useQuery({
    queryKey: ["sync-history", environmentId],
    queryFn: () => servicesApi.getSyncHistory(environmentId),
    enabled: !!environmentId,
  });
};

export const useCompareServices = (sourceEnvironmentId?: string, targetEnvironmentId?: string) => {
  return useQuery({
    queryKey: ["services-comparison", sourceEnvironmentId, targetEnvironmentId],
    queryFn: () => {
      console.log(
        "useCompareServices: Comparing services between environments:",
        sourceEnvironmentId,
        "->",
        targetEnvironmentId
      );
      return servicesApi.compareServices(sourceEnvironmentId!, targetEnvironmentId!);
    },
    enabled: !!(sourceEnvironmentId && targetEnvironmentId && sourceEnvironmentId !== targetEnvironmentId),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useCompareServicesByInstance = (sourceAppInstanceId?: string, targetAppInstanceId?: string) => {
  return useQuery({
    queryKey: ["services-comparison-instance", sourceAppInstanceId, targetAppInstanceId],
    queryFn: () => {
      console.log(
        "useCompareServicesByInstance: Comparing services between app instances:",
        sourceAppInstanceId,
        "->",
        targetAppInstanceId
      );
      return servicesApi.compareServicesByInstance(sourceAppInstanceId!, targetAppInstanceId!);
    },
    enabled: !!(sourceAppInstanceId && targetAppInstanceId && sourceAppInstanceId !== targetAppInstanceId),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useImageTags = (serviceId?: string) => {
  return useQuery({
    queryKey: ["image-tags", serviceId],
    queryFn: () => {
      console.log("useImageTags: Fetching image tags for service:", serviceId);
      return servicesApi.getImageTags(serviceId!);
    },
    enabled: !!serviceId,
    staleTime: 60000, // Consider data stale after 1 minute
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useUpdateServiceImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, tag }: { serviceId: string; tag: string }) => {
      const response = await servicesApi.updateServiceImage(serviceId, tag);
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch services data
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["image-tags", variables.serviceId] });

      console.log("Service image updated successfully:", data);
      return data;
    },
    onError: (error) => {
      console.error("Failed to update service image:", error);
      throw error;
    },
  });
};
