import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Service } from 'src/entities';
import { ServicesService } from './index';

export async function updateServiceImage(
  servicesService: ServicesService,
  serviceId: string,
  newTag: string,
): Promise<any> {
  servicesService.logger.log(`Updating service ${serviceId} to tag: ${newTag}`);

  // Check if serviceId is a valid UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = uuidRegex.test(serviceId);

  let service;

  if (isUuid) {
    // Try to find by UUID first
    service = await servicesService.serviceRepository.findOne({
      where: { id: serviceId },
      relations: [
        'appInstance',
        'appInstance.rancherSite',
        'appInstance.genericClusterSite',
      ],
    });
  } else {
    // Handle composite ID format: ${appInstanceId}-${serviceName}
    // This happens when services are fetched directly from Rancher without database lookup
    const parts = serviceId.split('-');
    if (parts.length >= 2) {
      // Try to extract appInstanceId (first part should be UUID) and serviceName (rest)
      // Find the longest UUID prefix
      let appInstanceId = '';
      let serviceName = '';

      // Try different split points to find valid UUID
      for (let i = 1; i < parts.length; i++) {
        const potentialUuid = parts.slice(0, i).join('-');
        if (uuidRegex.test(potentialUuid)) {
          appInstanceId = potentialUuid;
          serviceName = parts.slice(i).join('-');
          break;
        }
      }

      if (appInstanceId && serviceName) {
        servicesService.logger.debug(
          `Parsed composite ID: appInstanceId=${appInstanceId}, serviceName=${serviceName}`,
        );
        // Try to find service in database by name and appInstanceId
        service = await servicesService.serviceRepository.findOne({
          where: { name: serviceName, appInstanceId: appInstanceId },
          relations: [
            'appInstance',
            'appInstance.rancherSite',
            'appInstance.genericClusterSite',
          ],
        });

        // If not found in database, try to fetch directly from cluster
        if (!service) {
          servicesService.logger.debug(
            `Service not found in database, fetching directly from cluster`,
          );
          // Get app instance to fetch service directly
          const appInstance =
            await servicesService.appInstanceRepository.findOne({
              where: { id: appInstanceId },
              relations: ['rancherSite', 'genericClusterSite'],
            });

          if (appInstance) {
            // Use adapter to fetch deployments
            const adapter =
              await servicesService.clusterAdapterFactory.createAdapter(
                appInstance,
              );
            const deployments = await adapter.getDeployments(
              appInstance.cluster,
              appInstance.namespace,
            );

            const deployment = deployments.find(
              (dep) => dep.name === serviceName,
            );
            if (deployment) {
              // Create a temporary service object from the deployment
              service = new Service();
              service.id = serviceId; // Keep the composite ID
              service.name = deployment.name;
              service.appInstanceId = appInstance.id;
              service.status = deployment.state;
              service.replicas = deployment.scale;
              service.availableReplicas = deployment.availableReplicas;
              service.imageTag = deployment.image;
              service.workloadType = deployment.type;
              service.appInstance = appInstance;
            }
          }
        }
      }
    }
  }

  if (!service) {
    throw new NotFoundException(`Service with ID ${serviceId} not found`);
  }

  if (!service.appInstance) {
    throw new BadRequestException(
      `Service ${service.name} does not have an associated app instance`,
    );
  }

  // Validate that the app instance has a cluster site (either Rancher or generic)
  if (
    !service.appInstance.rancherSite &&
    !service.appInstance.genericClusterSite
  ) {
    throw new BadRequestException(
      `App instance ${service.appInstance.name} does not have an associated cluster site`,
    );
  }

  if (!service.imageTag) {
    throw new BadRequestException(
      `Service ${service.name} does not have an image tag`,
    );
  }

  // Parse the current image to get the image name without tag
  const currentImageParts = service.imageTag.split(':');
  let imageNameWithoutTag: string;

  if (currentImageParts.length > 1) {
    imageNameWithoutTag = currentImageParts.slice(0, -1).join(':');
  } else {
    imageNameWithoutTag = service.imageTag;
  }

  // Construct the new full image tag
  const newImageTag = `${imageNameWithoutTag}:${newTag}`;

  servicesService.logger.log(
    `Updating ${service.workloadType} ${service.name} from ${service.imageTag} to ${newImageTag}`,
  );

  try {
    // Use adapter to update the workload
    const adapter = await servicesService.clusterAdapterFactory.createAdapter(
      service.appInstance,
    );
    const result = await adapter.updateWorkloadImage(
      service.appInstance.cluster,
      service.appInstance.namespace,
      service.name,
      service.workloadType,
      newImageTag,
    );

    // Update the service record in our database (only if it exists in database with UUID)
    // If service was fetched directly from Rancher (composite ID), skip database update
    if (isUuid || (service.id && uuidRegex.test(service.id))) {
      service.imageTag = newImageTag;
      service.status = 'updating';
      await servicesService.serviceRepository.save(service);
    } else {
      servicesService.logger.debug(
        `Skipping database update for service with composite ID: ${serviceId}`,
      );
    }

    servicesService.logger.log(
      `Successfully updated service ${service.name} to ${newImageTag}`,
    );

    return {
      success: true,
      message: `Successfully updated ${service.name} to ${newTag}`,
      service: {
        id: service.id,
        name: service.name,
        oldImageTag: currentImageParts[currentImageParts.length - 1],
        newImageTag: newTag,
        fullNewImageTag: newImageTag,
      },
      rancherResponse: result,
    };
  } catch (error) {
    servicesService.logger.error(
      `Failed to update service ${service.name}: ${error.message}`,
      error.stack,
    );

    throw new BadRequestException(
      `Failed to update deployment image: ${error.message}`,
    );
  }
}
