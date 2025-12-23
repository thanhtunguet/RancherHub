import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Service } from 'src/entities';
import { ServicesService } from './index';
import { RegistryOperationNotSupportedError } from 'src/adapters/registry-adapter.interface';

export interface ImageTag {
  name: string;
  pushedAt: string;
  size?: number;
  sizeFormatted?: string;
}

export async function getImageTags(
  servicesService: ServicesService,
  serviceId: string,
): Promise<ImageTag[]> {
  servicesService.logger.debug(`Getting image tags for service: ${serviceId}`);

  // Check if serviceId is a valid UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = uuidRegex.test(serviceId);

  let service;

  if (isUuid) {
    // Try to find by UUID first
    service = await servicesService.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['appInstance', 'appInstance.rancherSite'],
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
          relations: ['appInstance', 'appInstance.rancherSite'],
        });

        // If not found in database, try to fetch directly from Rancher
        if (!service) {
          servicesService.logger.debug(
            `Service not found in database, fetching directly from Rancher`,
          );
          // Get app instance to fetch service directly
          const appInstance =
            await servicesService.appInstanceRepository.findOne({
              where: { id: appInstanceId },
              relations: ['rancherSite'],
            });

          if (appInstance) {
            // Fetch deployments from Rancher and find the matching service
            const deployments =
              await servicesService.rancherApiService.getDeploymentsFromK8sApi(
                appInstance.rancherSite,
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

  if (!service.imageTag) {
    throw new BadRequestException(
      `Service ${service.name} does not have an image tag`,
    );
  }

  servicesService.logger.debug(`Service image tag: ${service.imageTag}`);

  const imageTag = service.imageTag;

  try {
    const adapter =
      await servicesService.registryAdapterFactory.createAdapterFromImageRef(
        imageTag,
      );

    if (adapter.type === 'harbor') {
      servicesService.logger.debug('Resolved Harbor registry adapter');
      const host = imageTag.includes('/') ? imageTag.split('/')[0] : '';
      const parsed = parseHarborImageTag(imageTag, host);

      const tags = await adapter.listTags({
        projectOrNamespace: parsed.projectName,
        repository: parsed.repositoryName,
      });

      return tags.map((t) => ({
        name: t.name,
        pushedAt: t.pushedAt || '',
        size: t.size,
        sizeFormatted:
          typeof t.size === 'number' ? formatBytes(t.size) : undefined,
      }));
    }

    servicesService.logger.debug('Resolved DockerHub registry adapter');
    const parsed = parseDockerHubImageTag(imageTag);
    const tags = await adapter.listTags({
      projectOrNamespace: parsed.namespace,
      repository: parsed.repository,
    });

    return tags.map((t) => ({
      name: t.name,
      pushedAt: t.pushedAt || '',
      size: t.size,
      sizeFormatted:
        typeof t.size === 'number' ? formatBytes(t.size) : undefined,
    }));
  } catch (error) {
    servicesService.logger.error(
      `Failed to fetch image tags: ${error?.message || error}`,
      error?.stack,
    );
    if (error instanceof RegistryOperationNotSupportedError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(
      `Failed to fetch image tags: ${error?.message || error}`,
    );
  }
}

function parseDockerHubImageTag(imageTag: string): {
  namespace: string;
  repository: string;
  tag: string;
} {
  let imagePart: string;
  let tag: string;

  if (imageTag.includes(':')) {
    const lastColonIndex = imageTag.lastIndexOf(':');
    imagePart = imageTag.substring(0, lastColonIndex);
    tag = imageTag.substring(lastColonIndex + 1);

    // Check if tag contains '/' (might be registry with port)
    if (tag.includes('/')) {
      imagePart = imageTag;
      tag = 'latest';
    }
  } else {
    imagePart = imageTag;
    tag = 'latest';
  }

  let namespace: string;
  let repository: string;

  if (imagePart.includes('/')) {
    const parts = imagePart.split('/');
    namespace = parts[0];
    repository = parts.slice(1).join('/');
  } else {
    // Official images are in the 'library' namespace
    namespace = 'library';
    repository = imagePart;
  }

  return { namespace, repository, tag };
}

/**
 * Parse Harbor image tag format: harbor.domain/project-name/image-repository-name:tag
 *
 * Examples:
 * - harbor.example.com/myproject/myapp:v1.0
 *   -> projectName: "myproject", repositoryName: "myapp", tag: "v1.0"
 * - harbor.example.com/myproject/team/myapp:latest
 *   -> projectName: "myproject", repositoryName: "team/myapp", tag: "latest"
 */
function parseHarborImageTag(
  fullImageTag: string,
  harborDomainOrUrl: string,
): {
  projectName: string;
  repositoryName: string;
  tag: string;
} {
  // Accept either a full Harbor URL or a host; normalize to host-like form.
  const harborDomain = harborDomainOrUrl
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');

  // Split image tag by ':' to separate image path from tag
  // Format: harbor.domain/project-name/image-repository-name:tag
  let imagePart: string;
  let tag: string;

  if (fullImageTag.includes(':')) {
    const lastColonIndex = fullImageTag.lastIndexOf(':');
    imagePart = fullImageTag.substring(0, lastColonIndex);
    tag = fullImageTag.substring(lastColonIndex + 1);
  } else {
    imagePart = fullImageTag;
    tag = 'latest';
  }

  // Remove harbor domain if present
  // After this, imagePart should be: project-name/image-repository-name
  if (imagePart.startsWith(harborDomain + '/')) {
    imagePart = imagePart.substring(harborDomain.length + 1);
  }

  // Split by '/' to get project and repository
  // Format: project-name/image-repository-name (or project-name/path/to/image-repository-name)
  const parts = imagePart.split('/');

  if (parts.length < 2) {
    // If only one part, assume it's repository in 'library' project (fallback)
    return {
      projectName: 'library',
      repositoryName: parts[0],
      tag: tag,
    };
  } else {
    // First part is project-name, rest is image-repository-name
    // This handles both: "project/repo" and "project/path/to/repo"
    return {
      projectName: parts[0],
      repositoryName: parts.slice(1).join('/'),
      tag: tag,
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
