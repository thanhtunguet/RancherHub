import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import message from "antd/es/message";
import { genericClusterSitesApi } from "../services/api";
import type {
  CreateGenericClusterSiteRequest,
  GenericClusterSite,
} from "../types";

export const useGenericClusterSites = () => {
  return useQuery({
    queryKey: ["generic-clusters"],
    queryFn: genericClusterSitesApi.getAll,
  });
};

export const useCreateGenericClusterSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: genericClusterSitesApi.create,
    onSuccess: (newSite: GenericClusterSite) => {
      queryClient.invalidateQueries({ queryKey: ["generic-clusters"] });
      message.success(`Cluster "${newSite.name}" created successfully`);
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Failed to create generic cluster site",
      );
    },
  });
};

export const useUpdateGenericClusterSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateGenericClusterSiteRequest>;
    }) => genericClusterSitesApi.update(id, data),
    onSuccess: (updatedSite: GenericClusterSite) => {
      queryClient.invalidateQueries({ queryKey: ["generic-clusters"] });
      message.success(`Cluster "${updatedSite.name}" updated successfully`);
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Failed to update generic cluster site",
      );
    },
  });
};

export const useDeleteGenericClusterSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: genericClusterSitesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generic-clusters"] });
      message.success("Cluster deleted successfully");
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Failed to delete generic cluster site",
      );
    },
  });
};

export const useTestGenericClusterConnection = () => {
  return useMutation({
    mutationFn: genericClusterSitesApi.testConnection,
    onSuccess: (result) => {
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Connection test to generic cluster failed",
      );
    },
  });
};

export const useSetGenericClusterActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      active,
    }: {
      id: string;
      active: boolean;
    }) => genericClusterSitesApi.setActive(id, active),
    onSuccess: (site: GenericClusterSite) => {
      queryClient.invalidateQueries({ queryKey: ["generic-clusters"] });
      message.success(
        site.active
          ? `"${site.name}" is now the active cluster`
          : `"${site.name}" deactivated`,
      );
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          "Failed to update generic cluster active status",
      );
    },
  });
};


