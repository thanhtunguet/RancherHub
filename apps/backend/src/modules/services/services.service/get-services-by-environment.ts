import { Service } from 'src/entities';
import { ServicesService } from './index';
import { In } from 'typeorm';

export async function getServicesByEnvironment(
  service: ServicesService,
  environmentId: string,
): Promise<Service[]> {
  service.logger.debug(`Fetching services for environment: ${environmentId}`);

  // Get all app instances for this environment
  const appInstances = await service.appInstanceRepository.find({
    where: { environmentId },
    relations: ['rancherSite', 'services'],
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

  for (const appInstance of appInstances) {
    service.logger.debug(
      `Processing app instance: ${appInstance.name} (${appInstance.cluster}/${appInstance.namespace})`,
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
        allServices.push(svc);
        service.logger.debug(`Saved service: ${svc.name} (${svc.imageTag})`);
      }
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
      allServices.push(...cachedServices);
    }
  }

  // Load appInstance relations for all services before returning
  const serviceIds = allServices.map((svc) => svc.id);
  if (serviceIds.length > 0) {
    const servicesWithRelations = await service.serviceRepository.find({
      where: { id: In(serviceIds) },
      relations: ['appInstance'],
    });
    service.logger.debug(
      `Loaded ${servicesWithRelations.length} services with appInstance relations for environment ${environmentId}`,
    );
    return servicesWithRelations;
  }

  service.logger.debug(
    `Total services returned for environment ${environmentId}: ${allServices.length}`,
  );
  return allServices;
}
