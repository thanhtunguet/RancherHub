import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import message from "antd/es/message";
import { sitesApi } from "../services/api";
import { useAppStore } from "../stores/useAppStore";
import type { CreateSiteRequest, RancherSite } from "../types";

export const useSites = () => {
  return useQuery({
    queryKey: ["sites"],
    queryFn: sitesApi.getAll,
  });
};

export const useActiveSite = () => {
  return useQuery({
    queryKey: ["sites", "active"],
    queryFn: sitesApi.getActive,
  });
};

export const useCreateSite = () => {
  const queryClient = useQueryClient();
  const { setActiveSite } = useAppStore();

  return useMutation({
    mutationFn: sitesApi.create,
    onSuccess: (newSite) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      message.success(`Site "${newSite.name}" created successfully`);

      // If this is the first site, make it active
      const sites = queryClient.getQueryData<RancherSite[]>(["sites"]) || [];
      if (sites.length <= 1) {
        setActiveSite(newSite);
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Failed to create site");
    },
  });
};

export const useUpdateSite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateSiteRequest>;
    }) => sitesApi.update(id, data),
    onSuccess: (updatedSite) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["sites", "active"] });
      message.success(`Site "${updatedSite.name}" updated successfully`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Failed to update site");
    },
  });
};

export const useDeleteSite = () => {
  const queryClient = useQueryClient();
  const { activeSite, setActiveSite } = useAppStore();

  return useMutation({
    mutationFn: sitesApi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["sites", "active"] });

      // If the deleted site was active, clear it
      if (activeSite?.id === deletedId) {
        setActiveSite(null);
      }

      message.success("Site deleted successfully");
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Failed to delete site");
    },
  });
};

export const useTestConnection = () => {
  return useMutation({
    mutationFn: sitesApi.testConnection,
    onSuccess: (result) => {
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Connection test failed");
    },
  });
};

export const useActivateSite = () => {
  const queryClient = useQueryClient();
  const { setActiveSite } = useAppStore();

  return useMutation({
    mutationFn: sitesApi.activate,
    onSuccess: (activatedSite) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["sites", "active"] });
      setActiveSite(activatedSite);
      message.success(`"${activatedSite.name}" is now the active site`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Failed to activate site");
    },
  });
};
