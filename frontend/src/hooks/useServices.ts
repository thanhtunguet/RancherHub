import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { servicesApi } from '../services/api';

export const useServices = (environmentId?: string) => {
  return useQuery({
    queryKey: ['services', environmentId],
    queryFn: () => servicesApi.getByEnvironment(environmentId!),
    enabled: !!environmentId,
  });
};

export const useSyncServices = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: servicesApi.sync,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      
      if (result.status === 'completed') {
        message.success('Services synchronized successfully!');
      } else if (result.status === 'partial') {
        message.warning('Synchronization completed with some errors');
      } else {
        message.error('Synchronization failed');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to synchronize services');
    },
  });
};

export const useSyncHistory = (environmentId?: string) => {
  return useQuery({
    queryKey: ['sync-history', environmentId],
    queryFn: () => servicesApi.getSyncHistory(environmentId),
  });
};