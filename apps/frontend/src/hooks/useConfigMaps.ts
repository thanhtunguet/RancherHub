import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { configMapsApi } from '../services/api';
import type { ConfigMapData, ConfigMapComparisonResult } from '../types';

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