import { ServicesService } from './index';

export async function getAllAppInstancesGroupedByEnvironment(service: ServicesService): Promise<any> {
  service.logger.debug('Fetching all app instances grouped by environment');

  const appInstances = await service.appInstanceRepository.find({
    relations: ['environment', 'rancherSite'],
    order: {
      environment: { name: 'ASC' },
      name: 'ASC',
    },
  });

  // Group by environment
  const grouped = appInstances.reduce((acc, appInstance) => {
    const envId = appInstance.environmentId;
    const envName = appInstance.environment?.name || 'Unknown Environment';
    
    if (!acc[envId]) {
      acc[envId] = {
        id: envId,
        name: envName,
        appInstances: [],
      };
    }
    
    acc[envId].appInstances.push({
      id: appInstance.id,
      name: appInstance.name,
      cluster: appInstance.cluster,
      namespace: appInstance.namespace,
      rancherSite: {
        id: appInstance.rancherSite?.id,
        name: appInstance.rancherSite?.name,
      },
    });
    
    return acc;
  }, {});

  // Convert to array format
  return Object.values(grouped);
} 