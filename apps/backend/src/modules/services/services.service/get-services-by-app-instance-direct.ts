import { Service } from 'src/entities';
import { ServicesService } from './index';
import { NotFoundException, BadRequestException } from '@nestjs/common';

export async function getServicesByAppInstanceDirect(service: ServicesService, appInstanceId: string): Promise<Service[]> {
  service.logger.debug(`Fetching services directly from Rancher for app instance: ${appInstanceId}`);

  // Validate that appInstanceId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(appInstanceId)) {
    throw new BadRequestException(
      `Invalid app instance ID format. Expected UUID, got: ${appInstanceId}`,
    );
  }

  // Get the app instance
  const appInstance = await service.appInstanceRepository.findOne({
    where: { id: appInstanceId },
    relations: ['rancherSite', 'environment'],
  });

  if (!appInstance) {
    throw new NotFoundException(
      `App instance with ID ${appInstanceId} not found`,
    );
  }

  service.logger.debug(
    `Found app instance: ${appInstance.name} (${appInstance.cluster}/${appInstance.namespace})`,
  );

  try {
    // Fetch deployments directly from Rancher Kubernetes API
    const deployments = await service.rancherApiService.getDeploymentsFromK8sApi(
      appInstance.rancherSite,
      appInstance.cluster,
      appInstance.namespace,
    );
    
    service.logger.debug(
      `Received ${deployments.length} deployments from Rancher K8s API for ${appInstance.name}`,
    );

    // Convert deployments to Service objects without database operations
    const services: Service[] = deployments.map(dep => {
      const service = new Service();
      service.id = `${appInstanceId}-${dep.name}`; // Generate a consistent ID for frontend
      service.name = dep.name;
      service.appInstanceId = appInstance.id;
      service.status = dep.state;
      service.replicas = dep.scale;
      service.availableReplicas = dep.availableReplicas;
      service.imageTag = dep.image;
      service.workloadType = dep.type;
      service.createdAt = new Date(); // Current time as placeholder
      service.updatedAt = new Date(); // Current time as placeholder
      service.appInstance = appInstance; // Attach the app instance relation
      return service;
    });

    service.logger.debug(
      `Converted ${services.length} deployments to services for app instance ${appInstanceId}`,
    );

    return services;
  } catch (error) {
    service.logger.error(
      `Failed to fetch services from Rancher for app instance ${appInstance.name}: ${error.message}`,
    );
    throw error; // Don't fall back to database, fail fast to indicate real issue
  }
}