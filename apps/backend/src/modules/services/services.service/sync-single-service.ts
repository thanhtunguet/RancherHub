import { ServicesService } from './index';
import { NotFoundException } from '@nestjs/common';

export async function syncSingleService(
  service: ServicesService,
  serviceId: string,
  targetAppInstanceId: string,
  syncOperationId: string,
): Promise<any> {
  // Get source service
  const sourceService = await service.serviceRepository.findOne({
    where: { id: serviceId },
    relations: ['appInstance', 'appInstance.rancherSite', 'appInstance.environment'],
  });

  if (!sourceService) {
    throw new NotFoundException(`Source service not found: ${serviceId}`);
  }

  // Get target app instance
  const targetAppInstance = await service.appInstanceRepository.findOne({
    where: { id: targetAppInstanceId },
    relations: ['rancherSite', 'environment'],
  });

  if (!targetAppInstance) {
    throw new NotFoundException(
      `Target app instance not found: ${targetAppInstanceId}`,
    );
  }

  // Find or create target service
  let targetService = await service.serviceRepository.findOne({
    where: { name: sourceService.name, appInstanceId: targetAppInstanceId },
  });

  const previousImageTag = targetService?.imageTag || '';

  service.logger.log(
    `Syncing service ${sourceService.name} from ${sourceService.appInstance.cluster}/${sourceService.appInstance.namespace} to ${targetAppInstance.cluster}/${targetAppInstance.namespace}`,
  );
  service.logger.log(
    `Source image: ${sourceService.imageTag}`,
  );

  // Normalize workload type (remove plurals if present)
  const normalizedWorkloadType = sourceService.workloadType?.toLowerCase().replace(/s$/, '') || 'deployment';
  
  try {
    await service.rancherApiService.updateWorkloadImage(
      targetAppInstance.rancherSite,
      targetAppInstance.cluster,
      targetAppInstance.namespace,
      sourceService.name,
      normalizedWorkloadType,
      sourceService.imageTag,
    );
    service.logger.log(`Successfully updated workload ${sourceService.name} in Rancher`);
  } catch (rancherError) {
    service.logger.error(`Failed to update workload in Rancher: ${rancherError.message}`);
    throw new Error(`Rancher API update failed: ${rancherError.message}`);
  }

  // Update or create target service in database
  if (targetService) {
    targetService.imageTag = sourceService.imageTag;
    targetService.workloadType = normalizedWorkloadType;
    targetService.status = 'synced';
    targetService.lastSynced = new Date();
    targetService.updatedAt = new Date();
  } else {
    targetService = service.serviceRepository.create({
      name: sourceService.name,
      appInstanceId: targetAppInstanceId,
      status: 'synced',
      replicas: sourceService.replicas,
      availableReplicas: 0, // Will be updated on next fetch
      imageTag: sourceService.imageTag,
      workloadType: normalizedWorkloadType,
      lastSynced: new Date(),
    });
  }

  await service.serviceRepository.save(targetService);

  // Record sync in history with detailed information
  const startTime = Date.now();
  await service.syncHistoryRepository.save({
    syncOperationId,
    serviceId,
    serviceName: sourceService.name || null,
    workloadType: normalizedWorkloadType || null,
    sourceAppInstanceId: sourceService.appInstanceId,
    sourceEnvironmentName: sourceService.appInstance?.environment?.name || null,
    sourceCluster: sourceService.appInstance?.cluster || null,
    sourceNamespace: sourceService.appInstance?.namespace || null,
    targetAppInstanceId,
    targetEnvironmentName: targetAppInstance.environment?.name || null,
    targetCluster: targetAppInstance.cluster || null,
    targetNamespace: targetAppInstance.namespace || null,
    previousImageTag,
    newImageTag: sourceService.imageTag,
    containerName: sourceService.name || null,
    configChanges: {
      imageTag: {
        from: previousImageTag,
        to: sourceService.imageTag
      }
    },
    status: 'success',
    durationMs: Date.now() - startTime,
    timestamp: new Date(),
  });

  return {
    serviceId,
    targetAppInstanceId,
    previousImageTag,
    newImageTag: sourceService.imageTag,
    status: 'success',
  };
} 