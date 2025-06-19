import { ServicesService } from './index';

export async function compareServices(service: ServicesService, sourceEnvironmentId: string, targetEnvironmentId: string): Promise<any> {
  service.logger.debug(`Comparing services between environments: ${sourceEnvironmentId} -> ${targetEnvironmentId}`);

  // Fetch services from both environments
  const [sourceServices, targetServices] = await Promise.all([
    service.getServicesByEnvironment(sourceEnvironmentId),
    service.getServicesByEnvironment(targetEnvironmentId),
  ]);

  service.logger.debug(`Source services: ${sourceServices.length}, Target services: ${targetServices.length}`);

  // Create maps for quick lookup
  const sourceServiceMap = new Map(sourceServices.map(s => [s.name, s]));
  const targetServiceMap = new Map(targetServices.map(s => [s.name, s]));

  // Get all unique service names
  const allServiceNames = new Set([
    ...sourceServices.map(s => s.name),
    ...targetServices.map(s => s.name),
  ]);

  const comparisons = [];

  for (const serviceName of allServiceNames) {
    const sourceService = sourceServiceMap.get(serviceName);
    const targetService = targetServiceMap.get(serviceName);

    // Extract version from imageTag (part after ':')
    const extractVersion = (imageTag: string) => {
      if (!imageTag) return null;
      const parts = imageTag.split(':');
      return parts.length > 1 ? parts[parts.length - 1] : imageTag;
    };

    const sourceVersion = sourceService ? extractVersion(sourceService.imageTag) : null;
    const targetVersion = targetService ? extractVersion(targetService.imageTag) : null;

    const comparison = {
      serviceName,
      workloadType: sourceService?.workloadType || targetService?.workloadType,
      source: sourceService ? {
        environmentId: sourceEnvironmentId,
        imageTag: sourceService.imageTag,
        version: sourceVersion,
        status: sourceService.status,
        replicas: sourceService.replicas,
        availableReplicas: sourceService.availableReplicas,
        appInstanceId: sourceService.appInstanceId,
        lastUpdated: sourceService.updatedAt,
      } : null,
      target: targetService ? {
        environmentId: targetEnvironmentId,
        imageTag: targetService.imageTag,
        version: targetVersion,
        status: targetService.status,
        replicas: targetService.replicas,
        availableReplicas: targetService.availableReplicas,
        appInstanceId: targetService.appInstanceId,
        lastUpdated: targetService.updatedAt,
      } : null,
      differences: {
        existence: !sourceService || !targetService,
        imageTag: sourceService && targetService && sourceService.imageTag !== targetService.imageTag,
        version: sourceVersion !== targetVersion,
        status: sourceService && targetService && sourceService.status !== targetService.status,
        replicas: sourceService && targetService && sourceService.replicas !== targetService.replicas,
      },
      status: service.getComparisonStatus(sourceService, targetService),
      differenceType: service.getDifferenceType(sourceService, targetService),
    };

    comparisons.push(comparison);
  }

  // Sort comparisons by differenceType priority then by service name
  comparisons.sort((a, b) => {
    if (a.differenceType !== b.differenceType) {
      const statusOrder = { 'missing_in_source': 0, 'missing_in_target': 1, 'different': 2, 'identical': 3 };
      return statusOrder[a.differenceType] - statusOrder[b.differenceType];
    }
    return a.serviceName.localeCompare(b.serviceName);
  });

  const summary = {
    totalServices: allServiceNames.size,
    identical: comparisons.filter(c => c.differenceType === 'identical').length,
    different: comparisons.filter(c => c.differenceType === 'different').length,
    missingInSource: comparisons.filter(c => c.differenceType === 'missing_in_source').length,
    missingInTarget: comparisons.filter(c => c.differenceType === 'missing_in_target').length,
  };

  service.logger.debug(`Comparison summary:`, summary);

  return {
    sourceEnvironmentId,
    targetEnvironmentId,
    summary,
    comparisons,
  };
} 