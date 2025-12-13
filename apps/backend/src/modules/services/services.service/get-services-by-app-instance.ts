import { Service } from 'src/entities';
import { ServicesService } from './index';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';

export async function getServicesByAppInstance(
  service: ServicesService,
  appInstanceId: string,
): Promise<Service[]> {
  service.logger.debug(`Fetching services for app instance: ${appInstanceId}`);

  // Validate that appInstanceId is a valid UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(appInstanceId)) {
    throw new BadRequestException(
      `Invalid app instance ID format. Expected UUID, got: ${appInstanceId}`,
    );
  }

  // Get the app instance
  const appInstance = await service.appInstanceRepository.findOne({
    where: { id: appInstanceId },
    relations: ['rancherSite'],
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
    // Fetch deployments from Rancher Kubernetes API
    const deployments =
      await service.rancherApiService.getDeploymentsFromK8sApi(
        appInstance.rancherSite,
        appInstance.cluster,
        appInstance.namespace,
      );
    service.logger.debug(
      `Received ${deployments.length} deployments from Rancher K8s API for ${appInstance.name}`,
    );
    const services: Service[] = [];
    // Update or create services in database
    for (const dep of deployments) {
      let svc = await service.serviceRepository.findOne({
        where: { name: dep.name, appInstanceId: appInstance.id },
      });
      if (svc) {
        svc.status = dep.state;
        svc.replicas = dep.scale;
        svc.availableReplicas = dep.availableReplicas;
        svc.imageTag = dep.image;
        svc.workloadType = dep.type;
        svc.updatedAt = new Date();
      } else {
        svc = service.serviceRepository.create({
          name: dep.name,
          appInstanceId: appInstance.id,
          status: dep.state,
          replicas: dep.scale,
          availableReplicas: dep.availableReplicas,
          imageTag: dep.image,
          workloadType: dep.type,
        });
      }
      await service.serviceRepository.save(svc);
      services.push(svc);
      service.logger.debug(`Saved service: ${svc.name} (${svc.imageTag})`);
    }

    // Load appInstance relations for all services before returning
    const serviceIds = services.map((svc) => svc.id);
    if (serviceIds.length > 0) {
      const servicesWithRelations = await service.serviceRepository.find({
        where: { id: In(serviceIds) },
        relations: ['appInstance'],
      });
      service.logger.debug(
        `Loaded ${servicesWithRelations.length} services with appInstance relations for app instance ${appInstanceId}`,
      );
      return servicesWithRelations;
    }

    service.logger.debug(
      `Total services returned for app instance ${appInstanceId}: ${services.length}`,
    );
    return services;
  } catch (error) {
    service.logger.error(
      `Failed to fetch services from app instance ${appInstance.name}: ${error.message}`,
    );
    // If API fails, return cached services from database
    const cachedServices = await service.serviceRepository.find({
      where: { appInstanceId: appInstance.id },
      relations: ['appInstance'],
    });
    service.logger.debug(
      `Returning ${cachedServices.length} cached services for ${appInstance.name}`,
    );
    return cachedServices;
  }
}
