import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ServicesService } from './index';

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

  // Get the service with its app instance and rancher site
  const service = await servicesService.serviceRepository.findOne({
    where: { id: serviceId },
    relations: ['appInstance', 'appInstance.rancherSite'],
  });

  if (!service) {
    throw new NotFoundException(`Service with ID ${serviceId} not found`);
  }

  if (!service.imageTag) {
    throw new BadRequestException(
      `Service ${service.name} does not have an image tag`,
    );
  }

  servicesService.logger.debug(`Service image tag: ${service.imageTag}`);

  // Parse the image tag to determine registry type
  const imageTag = service.imageTag;

  // Check if it's a Harbor image
  if (imageTag.includes('.') && imageTag.includes('/')) {
    const firstPart = imageTag.split('/')[0];

    // Check if it's a Harbor registry (has dots and looks like a domain)
    if (firstPart.includes('.') && /\.[a-z]{2,}/.test(firstPart)) {
      servicesService.logger.debug('Detected Harbor registry image');
      return await getHarborImageTags(servicesService, imageTag);
    }
  }

  // Default to DockerHub
  servicesService.logger.debug('Detected DockerHub image');
  return await getDockerHubImageTags(servicesService, imageTag);
}

async function getDockerHubImageTags(
  servicesService: ServicesService,
  imageTag: string,
): Promise<ImageTag[]> {
  servicesService.logger.debug(`Fetching DockerHub tags for: ${imageTag}`);

  try {
    // Parse the image to get namespace and repository
    const parsed = parseDockerHubImageTag(imageTag);

    if (!parsed.namespace || !parsed.repository) {
      throw new BadRequestException(
        `Invalid DockerHub image format: ${imageTag}`,
      );
    }

    servicesService.logger.debug(
      `Parsed DockerHub image: namespace=${parsed.namespace}, repository=${parsed.repository}`,
    );

    // Fetch tags from DockerHub
    const tagsResponse = await servicesService.dockerHubApiService.getTags(
      parsed.namespace,
      parsed.repository,
      1, // page
      100, // pageSize - get first 100 tags
    );

    if (!tagsResponse || !tagsResponse.results) {
      return [];
    }

    // Map to our ImageTag interface and sort by pushed time descending
    return tagsResponse.results
      .map((tag) => ({
        name: tag.name,
        pushedAt: tag.tag_last_pushed || tag.last_updated,
        size: tag.full_size,
        sizeFormatted: formatBytes(tag.full_size),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.pushedAt).getTime();
        const dateB = new Date(b.pushedAt).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
  } catch (error) {
    servicesService.logger.error(
      `Failed to fetch DockerHub tags: ${error.message}`,
      error.stack,
    );
    throw new BadRequestException(
      `Failed to fetch image tags from DockerHub: ${error.message}`,
    );
  }
}

async function getHarborImageTags(
  servicesService: ServicesService,
  imageTag: string,
): Promise<ImageTag[]> {
  servicesService.logger.debug(`Fetching Harbor tags for: ${imageTag}`);

  try {
    // Get all Harbor sites
    const harborSites = await servicesService.harborSitesService.findAll();

    if (!harborSites || harborSites.length === 0) {
      throw new BadRequestException(
        'No Harbor sites configured. Please configure a Harbor site first.',
      );
    }

    // Try each Harbor site until we find one that matches
    let lastError: Error | null = null;

    for (const harborSite of harborSites) {
      const harborDomain = harborSite.url.replace(/^https?:\/\//, '');

      servicesService.logger.debug(
        `Checking if image ${imageTag} matches Harbor site: ${harborSite.name} (${harborDomain})`,
      );

      if (imageTag.startsWith(harborDomain)) {
        servicesService.logger.debug(
          `Found matching Harbor site: ${harborSite.name}`,
        );

        try {
          // Parse the image to get project and repository
          const parsed = parseHarborImageTag(imageTag, harborSite.url);

          if (!parsed.projectName || !parsed.repositoryName) {
            servicesService.logger.warn(
              `Failed to parse Harbor image tag: ${imageTag}`,
            );
            continue;
          }

          servicesService.logger.debug(
            `Parsed Harbor image: project=${parsed.projectName}, repository=${parsed.repositoryName}`,
          );

          // Fetch artifacts from Harbor
          const artifacts = await servicesService.harborApiService.getArtifacts(
            harborSite,
            parsed.projectName,
            parsed.repositoryName,
          );

          if (!artifacts || artifacts.length === 0) {
            servicesService.logger.warn(
              `No artifacts found for ${parsed.projectName}/${parsed.repositoryName}`,
            );
            return [];
          }

          // Extract all tags from artifacts and sort by push time descending
          const allTags: ImageTag[] = [];

          for (const artifact of artifacts) {
            if (artifact.tags && artifact.tags.length > 0) {
              for (const tag of artifact.tags) {
                allTags.push({
                  name: tag.name,
                  pushedAt: tag.push_time,
                  size: artifact.size,
                  sizeFormatted: formatBytes(artifact.size),
                });
              }
            }
          }

          servicesService.logger.debug(
            `Successfully fetched ${allTags.length} tags from Harbor`,
          );

          return allTags.sort((a, b) => {
            const dateA = new Date(a.pushedAt).getTime();
            const dateB = new Date(b.pushedAt).getTime();
            return dateB - dateA; // Descending order (newest first)
          });
        } catch (error) {
          servicesService.logger.error(
            `Error fetching from Harbor site ${harborSite.name}: ${error.message}`,
            error.stack,
          );
          lastError = error;
          // Continue to try other Harbor sites
          continue;
        }
      }
    }

    // If we get here, no Harbor site matched or all failed
    if (lastError) {
      throw new BadRequestException(
        `Failed to fetch image tags from Harbor: ${lastError.message}`,
      );
    }

    throw new BadRequestException(
      `No matching Harbor site found for image: ${imageTag}. Available Harbor sites: ${harborSites.map((s) => s.url.replace(/^https?:\/\//, '')).join(', ')}`,
    );
  } catch (error) {
    servicesService.logger.error(
      `Failed to fetch Harbor tags: ${error.message}`,
      error.stack,
    );

    // Re-throw if already a BadRequestException
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      `Failed to fetch image tags from Harbor: ${error.message}`,
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

function parseHarborImageTag(
  fullImageTag: string,
  harborUrl: string,
): {
  projectName: string;
  repositoryName: string;
  tag: string;
} {
  // Remove protocol from Harbor URL for comparison
  const harborDomain = harborUrl.replace(/^https?:\/\//, '');

  // Split image tag by ':'
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
  if (imagePart.startsWith(harborDomain + '/')) {
    imagePart = imagePart.substring(harborDomain.length + 1);
  }

  // Split by '/' to get project and repository
  const parts = imagePart.split('/');

  if (parts.length < 2) {
    // If only one part, assume it's repository in 'library' project
    return {
      projectName: 'library',
      repositoryName: parts[0],
      tag: tag,
    };
  } else {
    // First part is project, rest is repository
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
