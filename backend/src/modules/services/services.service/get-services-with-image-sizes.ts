import { ServicesService } from './index';

export async function getServicesWithImageSizes(service: ServicesService, appInstanceId: string): Promise<any[]> {
  service.logger.debug(`Fetching services with image sizes for app instance: ${appInstanceId}`);

  // Get services from the app instance
  const services = await service.getServicesByAppInstance(appInstanceId);
  
  // Get active Harbor site
  const harborSite = await service.harborSitesService.getActiveSite();

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

        // First, try to get size from Harbor if available and image appears to be from Harbor
        if (harborSite && !service.dockerHubApiService.isDockerHubImage(imageTag)) {
          service.logger.debug(`Trying Harbor API for image: ${imageTag}`);
          try {
            const harborSizeInfo = await service.harborApiService.getImageSize(harborSite, imageTag);
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
            service.logger.debug(`Harbor API failed for ${imageTag}: ${harborError.message}`);
          }
        }

        // If Harbor didn't work or image is from DockerHub, try DockerHub
        if (!sizeInfo && service.dockerHubApiService.isDockerHubImage(imageTag)) {
          service.logger.debug(`Trying DockerHub API for image: ${imageTag}`);
          try {
            const dockerHubSizeInfo = await service.dockerHubApiService.getImageSize(imageTag);
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
            service.logger.debug(`DockerHub API failed for ${imageTag}: ${dockerHubError.message}`);
          }
        }
        
        return {
          ...svc,
          imageSize: sizeInfo?.size || null,
          imageSizeFormatted: sizeInfo?.sizeFormatted || null,
          compressedImageSize: sizeInfo?.compressedSize || null,
          compressedImageSizeFormatted: sizeInfo?.compressedSizeFormatted || null,
          imageSource: sizeInfo?.source || null,
        };
      } catch (error) {
        service.logger.warn(`Failed to get image size for ${svc.name}: ${error.message}`);
        return {
          ...svc,
          imageSize: null,
          imageSizeFormatted: null,
          compressedImageSize: null,
          compressedImageSizeFormatted: null,
          imageSource: null,
        };
      }
    })
  );

  return enrichedServices;
} 