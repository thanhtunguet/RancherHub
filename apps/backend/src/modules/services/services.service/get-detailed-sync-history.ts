import { SyncHistory } from 'src/entities';
import { ServicesService } from './index';

export async function getDetailedSyncHistory(service: ServicesService, environmentId?: string): Promise<SyncHistory[]> {
  const queryBuilder = service.syncHistoryRepository
    .createQueryBuilder('history')
    .leftJoinAndSelect('history.syncOperation', 'operation')
    .orderBy('history.timestamp', 'DESC');

  if (environmentId) {
    queryBuilder
      .leftJoin('history.syncOperation', 'op')
      .where(
        'op.sourceEnvironmentId = :envId OR op.targetEnvironmentId = :envId',
        { envId: environmentId },
      );
  }

  return queryBuilder.getMany();
} 