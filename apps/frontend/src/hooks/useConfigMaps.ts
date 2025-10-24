import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { configMapsApi } from '../services/api';
import type { ConfigMapData, ConfigMapComparisonResult, ConfigMapDetailedComparison } from '../types';

export const useConfigMapsByAppInstance = (
  appInstanceId: string | undefined
): UseQueryResult<ConfigMapData[], Error> => {
  return useQuery({
    queryKey: ['configmaps', 'by-app-instance', appInstanceId],
    queryFn: () => configMapsApi.getByAppInstance(appInstanceId!),
    enabled: !!appInstanceId,
    staleTime: 30000, // 30 seconds
  });
};

export const useConfigMapComparison = (
  sourceAppInstanceId: string | undefined,
  targetAppInstanceId: string | undefined
): UseQueryResult<ConfigMapComparisonResult, Error> => {
  return useQuery({
    queryKey: ['configmaps', 'compare', sourceAppInstanceId, targetAppInstanceId],
    queryFn: () => 
      configMapsApi.compareConfigMapsByInstance(sourceAppInstanceId!, targetAppInstanceId!),
    enabled: !!sourceAppInstanceId && !!targetAppInstanceId && sourceAppInstanceId !== targetAppInstanceId,
    staleTime: 60000, // 1 minute
  });
};
export const useConfigMapDetails = (
  configMapName: string | undefined,
  sourceAppInstanceId: string | undefined,
  targetAppInstanceId: string | undefined
): UseQueryResult<ConfigMapDetailedComparison, Error> => {
  return useQuery({
    queryKey: ['configmaps', 'details', configMapName, sourceAppInstanceId, targetAppInstanceId],
    queryFn: () => 
      configMapsApi.getConfigMapDetails(configMapName!, sourceAppInstanceId!, targetAppInstanceId!),
    enabled: !!configMapName && !!sourceAppInstanceId && !!targetAppInstanceId && sourceAppInstanceId !== targetAppInstanceId,
    staleTime: 30000, // 30 seconds
  });
};

export const useSyncConfigMapKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configMapsApi.syncConfigMapKey,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['configmaps'] });
    },
  });
};

export const useSyncConfigMapKeys = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configMapsApi.syncConfigMapKeys,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['configmaps'] });
    },
  });
};
