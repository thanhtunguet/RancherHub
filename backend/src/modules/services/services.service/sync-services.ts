import { SyncServicesDto } from '../dto/sync-services.dto';
import { ServicesService } from './index';

export async function syncServices(service: ServicesService, syncDto: SyncServicesDto): Promise<any> {
  service.logger.log(
    `Starting sync operation from env ${syncDto.sourceEnvironmentId} to ${syncDto.targetEnvironmentId}`,
  );

  // Create sync operation record
  const syncOperation = service.syncOperationRepository.create({
    sourceEnvironmentId: syncDto.sourceEnvironmentId,
    targetEnvironmentId: syncDto.targetEnvironmentId,
    serviceIds: syncDto.serviceIds,
    status: 'pending',
    startTime: new Date(),
    initiatedBy: 'system', // TODO: Add user context
  });

  await service.syncOperationRepository.save(syncOperation);

  const syncResults = [];
  let hasErrors = false;

  try {
    // New approach: sync each service to all selected target instances
    for (const serviceId of syncDto.serviceIds) {
      for (const targetAppInstanceId of syncDto.targetAppInstanceIds) {
        try {
          const result = await service.syncSingleService(
            serviceId,
            targetAppInstanceId,
            syncOperation.id,
          );
          syncResults.push(result);
        } catch (error) {
          service.logger.error(
            `Failed to sync service ${serviceId} to target instance ${targetAppInstanceId}: ${error.message}`,
          );
          hasErrors = true;

          const errorResult = {
            serviceId,
            targetAppInstanceId,
            status: 'failed',
            error: error.message,
          };
          syncResults.push(errorResult);

          // Record failed sync in history
          await service.syncHistoryRepository.save({
            syncOperationId: syncOperation.id,
            serviceId,
            serviceName: null,
            workloadType: null,
            sourceAppInstanceId: '', // We'll need to fetch this
            sourceEnvironmentName: null,
            sourceCluster: null,
            sourceNamespace: null,
            targetAppInstanceId,
            targetEnvironmentName: null,
            targetCluster: null,
            targetNamespace: null,
            previousImageTag: '',
            newImageTag: '',
            containerName: null,
            configChanges: null,
            status: 'failed',
            error: error.message,
            durationMs: null,
            timestamp: new Date(),
          });
        }
      }
    }

    // Update sync operation status
    syncOperation.status = hasErrors ? 'partial' : 'completed';
    syncOperation.endTime = new Date();
    await service.syncOperationRepository.save(syncOperation);

    return {
      id: syncOperation.id,
      status: syncOperation.status,
      startTime: syncOperation.startTime,
      endTime: syncOperation.endTime,
      results: syncResults,
    };
  } catch (error) {
    // Mark entire operation as failed
    syncOperation.status = 'failed';
    syncOperation.endTime = new Date();
    await service.syncOperationRepository.save(syncOperation);
    throw error;
  }
} 