import { Service } from 'src/entities';
import { ServicesService } from './index';

export async function getServicesByEnvironmentDirect(
  service: ServicesService,
  environmentId: string,
): Promise<Service[]> {
  service.logger.debug(
    `Fetching services directly from Rancher for environment: ${environmentId}`,
  );

  // Get all app instances for this environment
  const appInstances = await service.appInstanceRepository.find({
    where: { environmentId },
    relations: ['rancherSite', 'environment'],
  });

  service.logger.debug(
    `Found ${appInstances.length} app instances for environment: ${environmentId}`,
  );

  if (appInstances.length === 0) {
    service.logger.warn(
      `No app instances found for environment: ${environmentId}`,
    );
    return [];
  }

  const allServices: Service[] = [];

  // Fetch services from all app instances in parallel for better performance
  const servicePromises = appInstances.map(async (appInstance) => {
    service.logger.debug(
      `Processing app instance: ${appInstance.name} (${appInstance.cluster}/${appInstance.namespace})`,
    );

    try {
      // Fetch deployments directly from Rancher Kubernetes API
      const deployments =
        await service.rancherApiService.getDeploymentsFromK8sApi(
          appInstance.rancherSite,
          appInstance.cluster,
          appInstance.namespace,
        );

      service.logger.debug(
        `Received ${deployments.length} deployments from Rancher K8s API for ${appInstance.name}`,
      );

      // Convert deployments to Service objects without database operations
      return deployments.map((dep) => {
        const serviceObj = new Service();
        serviceObj.id = `${appInstance.id}-${dep.name}`; // Generate a consistent ID
        serviceObj.name = dep.name;
        serviceObj.appInstanceId = appInstance.id;
        serviceObj.status = dep.state;
        serviceObj.replicas = dep.scale;
        serviceObj.availableReplicas = dep.availableReplicas;
        serviceObj.imageTag = dep.image;
        serviceObj.workloadType = dep.type;
        serviceObj.createdAt = new Date(); // Current time as placeholder
        serviceObj.updatedAt = new Date(); // Current time as placeholder
        serviceObj.appInstance = appInstance; // Attach the app instance relation
        return serviceObj;
      });
    } catch (error) {
      service.logger.error(
        `Failed to fetch services from Rancher for app instance ${appInstance.name}: ${error.message}`,
      );
      // Return empty array for this app instance if it fails
      return [];
    }
  });

  // Wait for all app instances to be processed
  const serviceArrays = await Promise.all(servicePromises);

  // Flatten the array of arrays
  serviceArrays.forEach((services) => {
    allServices.push(...services);
  });

  service.logger.debug(
    `Total services fetched for environment ${environmentId}: ${allServices.length}`,
  );

  return allServices;
}
