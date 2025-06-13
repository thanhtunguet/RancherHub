import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { appInstancesApi } from '../services/api';
import type { CreateAppInstanceRequest } from '../types';

export const useAppInstances = (environmentId?: string) => {
  return useQuery({
    queryKey: ['app-instances', environmentId],
    queryFn: () => appInstancesApi.getAll(environmentId),
    enabled: !!environmentId,
  });
};

export const useAppInstancesByEnvironment = (environmentId: string) => {
  return useQuery({
    queryKey: ['app-instances', 'environment', environmentId],
    queryFn: () => appInstancesApi.getByEnvironment(environmentId),
    enabled: !!environmentId,
  });
};

export const useAppInstancesBySite = (siteId: string) => {
  return useQuery({
    queryKey: ['app-instances', 'site', siteId],
    queryFn: () => appInstancesApi.getBySite(siteId),
    enabled: !!siteId,
  });
};

export const useCreateAppInstance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: appInstancesApi.create,
    onSuccess: (newAppInstance) => {
      queryClient.invalidateQueries({ queryKey: ['app-instances'] });
      message.success(`App instance "${newAppInstance.name}" created successfully`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create app instance');
    },
  });
};

export const useUpdateAppInstance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAppInstanceRequest> }) =>
      appInstancesApi.update(id, data),
    onSuccess: (updatedAppInstance) => {
      queryClient.invalidateQueries({ queryKey: ['app-instances'] });
      message.success(`App instance "${updatedAppInstance.name}" updated successfully`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update app instance');
    },
  });
};

export const useDeleteAppInstance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: appInstancesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-instances'] });
      message.success('App instance deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete app instance');
    },
  });
};