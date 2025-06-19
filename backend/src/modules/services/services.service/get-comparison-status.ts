import { Service } from 'src/entities';
import { ServicesService } from './index';

export function getComparisonStatus(service: ServicesService, sourceService: Service, targetService: Service): string {
  if (!sourceService || !targetService) {
    return 'missing';
  }
  
  if (sourceService.imageTag !== targetService.imageTag || 
      sourceService.status !== targetService.status ||
      sourceService.replicas !== targetService.replicas) {
    return 'different';
  }
  
  return 'identical';
} 