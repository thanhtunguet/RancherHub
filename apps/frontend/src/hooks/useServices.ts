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

      return data;
    },
    onError: (error) => {
      throw error;
    },
  });
};
