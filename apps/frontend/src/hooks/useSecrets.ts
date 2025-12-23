import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { secretsApi } from '../services/api';
import type { SecretData, SecretComparisonResult, SecretDetailedComparison } from '../types';

export const useSecretsByAppInstance = (
  appInstanceId: string | undefined
): UseQueryResult<SecretData[], Error> => {
  return useQuery({
    queryKey: ['secrets', 'by-app-instance', appInstanceId],
    queryFn: () => secretsApi.getByAppInstance(appInstanceId!),
    enabled: !!appInstanceId,
    staleTime: 30000, // 30 seconds
  });
};

export const useSecretComparison = (
  sourceAppInstanceId: string | undefined,
  targetAppInstanceId: string | undefined
): UseQueryResult<SecretComparisonResult, Error> => {
  return useQuery({
    queryKey: ['secrets', 'compare', sourceAppInstanceId, targetAppInstanceId],
    queryFn: () => 
      secretsApi.compareSecretsByInstance(sourceAppInstanceId!, targetAppInstanceId!),
    enabled: !!sourceAppInstanceId && !!targetAppInstanceId && sourceAppInstanceId !== targetAppInstanceId,
    staleTime: 60000, // 1 minute
  });
};

export const useSecretDetails = (
  secretName: string | undefined,
  sourceAppInstanceId: string | undefined,
  targetAppInstanceId: string | undefined
): UseQueryResult<SecretDetailedComparison, Error> => {
  return useQuery({
    queryKey: ['secrets', 'details', secretName, sourceAppInstanceId, targetAppInstanceId],
    queryFn: () => 
      secretsApi.getSecretDetails(secretName!, sourceAppInstanceId!, targetAppInstanceId!),
    enabled: !!secretName && !!sourceAppInstanceId && !!targetAppInstanceId && sourceAppInstanceId !== targetAppInstanceId,
    staleTime: 30000, // 30 seconds
  });
};

export const useSyncSecretKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: secretsApi.syncSecretKey,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
};

export const useSyncSecretKeys = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: secretsApi.syncSecretKeys,
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['secrets'] });
    },
  });
};