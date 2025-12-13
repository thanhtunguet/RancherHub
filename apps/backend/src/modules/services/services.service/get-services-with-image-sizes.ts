import { ServicesService } from './index';

export async function getServicesWithImageSizes(
  service: ServicesService,
  appInstanceId: string,
): Promise<any[]> {
  service.logger.debug(
    `Fetching services with image sizes for app instance: ${appInstanceId}`,
  );

  // Get services from the app instance
  const services = await service.getServicesByAppInstance(appInstanceId);

  // Get all Harbor sites (not just active) to check which registry each image belongs to
  const harborSites = await service.harborSitesService.findAll();

  // Enrich services with image size information from Harbor or DockerHub
  const enrichedServices = await Promise.all(
    services.map(async (svc) => {
      try {
        // Get the full image tag from service
        const imageTag = svc.imageTag;
        if (!imageTag) {
          return {
            ...svc,
            imageSize: null,
            imageSizeFormatted: null,
            compressedImageSize: null,
            compressedImageSizeFormatted: null,
            imageSource: null,
          };
        }

        let sizeInfo = null;
        let matchedHarborSite = null;

        // Check if image belongs to any Harbor site by checking if it contains a domain name
        if (harborSites && harborSites.length > 0) {
          for (const harborSite of harborSites) {
            // Remove protocol from Harbor URL for comparison
            const harborDomain = harborSite.url.replace(/^https?:\/\//, '');
            
            // Check if image tag starts with this Harbor site's domain
            // Image format: domain.com/project/repo:tag or domain.com/project/repo
            if (imageTag.startsWith(harborDomain)) {
              matchedHarborSite = harborSite;
              service.logger.debug(
                `Image ${imageTag} matches Harbor site: ${harborSite.name} (${harborDomain})`,
              );
              break;
            }
          }
        }

        // If image belongs to a Harbor site, try to get size from Harbor API
        if (matchedHarborSite) {
          service.logger.debug(
            `Trying Harbor API for image: ${imageTag} from site: ${matchedHarborSite.name}`,
          );
          try {
            const harborSizeInfo = await service.harborApiService.getImageSize(
              matchedHarborSite,
              imageTag,
            );
            if (harborSizeInfo) {
              sizeInfo = {
                size: harborSizeInfo.size,
                sizeFormatted: harborSizeInfo.sizeFormatted,
                compressedSize: harborSizeInfo.compressedSize,
                compressedSizeFormatted: harborSizeInfo.compressedSizeFormatted,
                source: 'Harbor',
              };
            }
          } catch (harborError) {
            service.logger.debug(
              `Harbor API failed for ${imageTag}: ${harborError.message}`,
            );
          }
        } else {
          // Image doesn't have a domain name from any Harbor site, treat as Docker Hub public
          service.logger.debug(
            `Image ${imageTag} doesn't match any Harbor site, treating as Docker Hub public`,
          );
          try {
            const dockerHubSizeInfo =
              await service.dockerHubApiService.getImageSize(imageTag);
            if (dockerHubSizeInfo) {
              sizeInfo = {
                size: dockerHubSizeInfo.size,
                sizeFormatted: dockerHubSizeInfo.sizeFormatted,
                compressedSize: null, // DockerHub doesn't provide compressed size
                compressedSizeFormatted: null,
                source: dockerHubSizeInfo.source,
              };
            }
          } catch (dockerHubError) {
            service.logger.debug(
              `DockerHub API failed for ${imageTag}: ${dockerHubError.message}`,
            );
          }
        }

        return {
          ...svc,
          imageSize: sizeInfo?.size || null,
          imageSizeFormatted: sizeInfo?.sizeFormatted || null,
          compressedImageSize: sizeInfo?.compressedSize || null,
          compressedImageSizeFormatted:
            sizeInfo?.compressedSizeFormatted || null,
          imageSource: sizeInfo?.source || null,
        };
      } catch (error) {
        service.logger.warn(
          `Failed to get image size for ${svc.name}: ${error.message}`,
        );
        return {
          ...svc,
          imageSize: null,
          imageSizeFormatted: null,
          compressedImageSize: null,
          compressedImageSizeFormatted: null,
          imageSource: null,
        };
      }
    }),
  );

  return enrichedServices;
}
