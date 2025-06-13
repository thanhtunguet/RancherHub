import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { environmentsApi } from '../services/api';
import { useAppStore } from '../stores/useAppStore';
import type { CreateEnvironmentRequest, Environment } from '../types';

export const useEnvironments = () => {
  return useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.getAll,
  });
};

export const useEnvironment = (id: string | undefined) => {
  return useQuery({
    queryKey: ['environments', id],
    queryFn: () => environmentsApi.getOne(id!),
    enabled: !!id,
  });
};

export const useEnvironmentWithInstances = (id: string | undefined) => {
  return useQuery({
    queryKey: ['environments', id, 'with-instances'],
    queryFn: () => environmentsApi.getWithInstances(id!),
    enabled: !!id,
  });
};

export const useCreateEnvironment = () => {
  const queryClient = useQueryClient();
  const { setSelectedEnvironment } = useAppStore();
  
  return useMutation({
    mutationFn: environmentsApi.create,
    onSuccess: (newEnvironment) => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      message.success(`Environment "${newEnvironment.name}" created successfully`);
      
      // If this is the first environment, select it
      const environments = queryClient.getQueryData<Environment[]>(['environments']) || [];
      if (environments.length <= 1) {
        setSelectedEnvironment(newEnvironment);
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create environment');
    },
  });
};

export const useUpdateEnvironment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEnvironmentRequest> }) =>
      environmentsApi.update(id, data),
    onSuccess: (updatedEnvironment) => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments', updatedEnvironment.id] });
      message.success(`Environment "${updatedEnvironment.name}" updated successfully`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update environment');
    },
  });
};

export const useDeleteEnvironment = () => {
  const queryClient = useQueryClient();
  const { selectedEnvironment, setSelectedEnvironment } = useAppStore();
  
  return useMutation({
    mutationFn: environmentsApi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      
      // If the deleted environment was selected, clear it
      if (selectedEnvironment?.id === deletedId) {
        setSelectedEnvironment(null);
      }
      
      message.success('Environment deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete environment');
    },
  });
};