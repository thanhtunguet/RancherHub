import { Service } from 'src/entities';
import { ServicesService } from './index';

export function getDifferenceType(
  service: ServicesService,
  sourceService: Service,
  targetService: Service,
): string {
  if (!sourceService && targetService) {
    return 'missing_in_source';
  }
  if (sourceService && !targetService) {
    return 'missing_in_target';
  }
  if (
    sourceService &&
    targetService &&
    (sourceService.imageTag !== targetService.imageTag ||
      sourceService.status !== targetService.status ||
      sourceService.replicas !== targetService.replicas)
  ) {
    return 'different';
  }
  return 'identical';
}
