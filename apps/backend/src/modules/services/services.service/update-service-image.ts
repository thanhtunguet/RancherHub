import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ServicesService } from './index';

export async function updateServiceImage(
  servicesService: ServicesService,
  serviceId: string,
  newTag: string,
): Promise<any> {
  servicesService.logger.log(
    `Updating service ${serviceId} to tag: ${newTag}`,
  );

  // Get the service with its app instance and rancher site
  const service = await servicesService.serviceRepository.findOne({
    where: { id: serviceId },
    relations: ['appInstance', 'appInstance.rancherSite'],
  });

  if (!service) {
    throw new NotFoundException(`Service with ID ${serviceId} not found`);
  }

  if (!service.appInstance) {
    throw new BadRequestException(
      `Service ${service.name} does not have an associated app instance`,
    );
  }

  if (!service.appInstance.rancherSite) {
    throw new BadRequestException(
      `App instance ${service.appInstance.name} does not have an associated Rancher site`,
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
    // Use Rancher API to update the workload
    const result = await servicesService.rancherApiService.updateWorkloadImage(
      service.appInstance.rancherSite,
      service.appInstance.cluster,
      service.appInstance.namespace,
      service.name,
      service.workloadType,
      newImageTag,
    );

    // Update the service record in our database
    service.imageTag = newImageTag;
    service.status = 'updating';
    await servicesService.serviceRepository.save(service);

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
