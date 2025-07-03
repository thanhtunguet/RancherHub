import { SyncOperation } from 'src/entities';
import { ServicesService } from './index';

export async function getSyncHistory(service: ServicesService, environmentId?: string): Promise<SyncOperation[]> {
  const queryBuilder = service.syncOperationRepository
    .createQueryBuilder('operation')
    .leftJoinAndSelect('operation.syncHistory', 'history')
    .orderBy('operation.startTime', 'DESC');

  if (environmentId) {
    queryBuilder.where(
      'operation.sourceEnvironmentId = :envId OR operation.targetEnvironmentId = :envId',
      { envId: environmentId },
    );
  }

  return queryBuilder.getMany();
} 