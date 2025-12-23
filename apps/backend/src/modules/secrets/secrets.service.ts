import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppInstance } from '../../entities/app-instance.entity';
import { SyncOperation } from '../../entities/sync-operation.entity';
import { SyncHistory } from '../../entities/sync-history.entity';
import { RancherApiService } from '../../services/rancher-api.service';

export interface SecretData {
  id: string;
  name: string;
  namespace: string;
  type: string;
  data?: Record<string, string>;
  dataKeys: string[];
  dataSize: number;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp: string;
  resourceVersion: string;
  appInstanceId: string;
}

export interface SecretComparison {
  secretName: string;
  source: SecretData | null;
  target: SecretData | null;
  status: 'identical' | 'different' | 'missing';
  differenceType:
    | 'missing-in-source'
    | 'missing-in-target'
    | 'data-different'
    | 'identical';
  differences: {
    keys: {
      onlyInSource: string[];
      onlyInTarget: string[];
      different: string[];
      identical: string[];
    };
    metadata: {
      labels: any;
      annotations: any;
    };
  };
}

export interface SecretComparisonResult {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  summary: {
    totalSecrets: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
  comparisons: SecretComparison[];
}

export interface SecretKeyComparison {
  key: string;
  sourceExists: boolean;
  targetExists: boolean;
  isDifferent: boolean;
  missingInSource: boolean;
  missingInTarget: boolean;
  identical: boolean;
}

export interface SecretDetailedComparison {
  secretName: string;
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  source: SecretData | null;
  target: SecretData | null;
  keyComparisons: SecretKeyComparison[];
  summary: {
    totalKeys: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
}

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  constructor(
    @InjectRepository(AppInstance)
    private readonly appInstanceRepository: Repository<AppInstance>,
    @InjectRepository(SyncOperation)
    private readonly syncOperationRepository: Repository<SyncOperation>,
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>,
    private readonly rancherApiService: RancherApiService,
  ) {}

  async getSecretsByAppInstance(appInstanceId: string): Promise<SecretData[]> {
    this.logger.debug(`Getting secrets for app instance: ${appInstanceId}`);

    const appInstance = await this.appInstanceRepository.findOne({
      where: { id: appInstanceId },
      relations: ['rancherSite'],
    });

    if (!appInstance) {
      throw new NotFoundException('App instance not found');
    }

    try {
      const secrets = await this.rancherApiService.getSecretsFromK8sApi(
        appInstance.rancherSite,
        appInstance.cluster,
        appInstance.namespace,
      );

      return secrets.map((secret) => ({
        id: secret.id,
        name: secret.name,
        namespace: secret.namespace,
        type: secret.type || 'Opaque',
        data: secret.data || {},
        dataKeys: secret.dataKeys,
        dataSize: secret.dataSize,
        labels: secret.labels || {},
        annotations: secret.annotations || {},
        creationTimestamp: secret.creationTimestamp,
        resourceVersion: secret.resourceVersion,
        appInstanceId,
      }));
    } catch (error) {
      this.logger.error(
        `Error fetching secrets: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async compareSecretsByInstance(
    sourceAppInstanceId: string,
    targetAppInstanceId: string,
  ): Promise<SecretComparisonResult> {
    this.logger.debug(
      `Comparing secrets between instances: ${sourceAppInstanceId} -> ${targetAppInstanceId}`,
    );

    const [sourceSecrets, targetSecrets] = await Promise.all([
      this.getSecretsByAppInstance(sourceAppInstanceId),
      this.getSecretsByAppInstance(targetAppInstanceId),
    ]);

    const sourceSecretsMap = new Map(
      sourceSecrets.map((secret) => [secret.name, secret]),
    );
    const targetSecretsMap = new Map(
      targetSecrets.map((secret) => [secret.name, secret]),
    );

    const allSecretNames = new Set([
      ...sourceSecretsMap.keys(),
      ...targetSecretsMap.keys(),
    ]);
    const comparisons: SecretComparison[] = [];

    for (const secretName of allSecretNames) {
      const sourceSecret = sourceSecretsMap.get(secretName) || null;
      const targetSecret = targetSecretsMap.get(secretName) || null;

      const comparison = this.createSecretComparison(
        secretName,
        sourceSecret,
        targetSecret,
      );
      comparisons.push(comparison);
    }

    const summary = {
      totalSecrets: comparisons.length,
      identical: comparisons.filter((c) => c.status === 'identical').length,
      different: comparisons.filter((c) => c.status === 'different').length,
      missingInSource: comparisons.filter(
        (c) => c.differenceType === 'missing-in-source',
      ).length,
      missingInTarget: comparisons.filter(
        (c) => c.differenceType === 'missing-in-target',
      ).length,
    };

    return {
      sourceAppInstanceId,
      targetAppInstanceId,
      summary,
      comparisons,
    };
  }

  private createSecretComparison(
    secretName: string,
    source: SecretData | null,
    target: SecretData | null,
  ): SecretComparison {
    if (!source && !target) {
      throw new Error('Both source and target secrets cannot be null');
    }

    if (!source) {
      return {
        secretName,
        source: null,
        target,
        status: 'missing',
        differenceType: 'missing-in-source',
        differences: this.calculateDifferences(null, target),
      };
    }

    if (!target) {
      return {
        secretName,
        source,
        target: null,
        status: 'missing',
        differenceType: 'missing-in-target',
        differences: this.calculateDifferences(source, null),
      };
    }

    const differences = this.calculateDifferences(source, target);
    const status = this.getComparisonStatus(differences);
    const differenceType = this.getDifferenceType(differences);

    return {
      secretName,
      source,
      target,
      status,
      differenceType,
      differences,
    };
  }

  private calculateDifferences(
    source: SecretData | null,
    target: SecretData | null,
  ) {
    if (!source || !target) {
      const existingSecret = source || target;
      return {
        keys: {
          onlyInSource: source ? existingSecret.dataKeys : [],
          onlyInTarget: target ? existingSecret.dataKeys : [],
          different: [],
          identical: [],
        },
        metadata: {
          labels: source ? existingSecret.labels : target?.labels || {},
          annotations: source
            ? existingSecret.annotations
            : target?.annotations || {},
        },
      };
    }

    const sourceKeys = new Set(source.dataKeys);
    const targetKeys = new Set(target.dataKeys);

    const onlyInSource = source.dataKeys.filter((key) => !targetKeys.has(key));
    const onlyInTarget = target.dataKeys.filter((key) => !sourceKeys.has(key));
    const commonKeys = source.dataKeys.filter((key) => targetKeys.has(key));

    // Note: For secrets, we don't compare actual values for security reasons
    // We only compare the presence/absence of keys
    const different: string[] = [];
    const identical = commonKeys.filter((key) => {
      const sourceValue = source.data?.[key] || '';
      const targetValue = target.data?.[key] || '';
      if (sourceValue !== targetValue) {
        different.push(key);
        return false;
      }
      return true;
    });

    return {
      keys: {
        onlyInSource,
        onlyInTarget,
        different,
        identical,
      },
      metadata: {
        labels: {
          source: source.labels || {},
          target: target.labels || {},
        },
        annotations: {
          source: source.annotations || {},
          target: target.annotations || {},
        },
      },
    };
  }

  private getComparisonStatus(
    differences: any,
  ): 'identical' | 'different' | 'missing' {
    const { keys } = differences;
    if (
      keys.onlyInSource.length === 0 &&
      keys.onlyInTarget.length === 0 &&
      keys.different.length === 0
    ) {
      return 'identical';
    }
    return 'different';
  }

  private getDifferenceType(
    differences: any,
  ):
    | 'missing-in-source'
    | 'missing-in-target'
    | 'data-different'
    | 'identical' {
    const { keys } = differences;

    if (
      keys.onlyInSource.length === 0 &&
      keys.onlyInTarget.length === 0 &&
      keys.different.length === 0
    ) {
      return 'identical';
    }

    return 'data-different';
  }

  async getSecretDetails(
    secretName: string,
    sourceAppInstanceId: string,
    targetAppInstanceId: string,
  ) {
    this.logger.debug(
      `Getting secret details for: ${secretName} between ${sourceAppInstanceId} and ${targetAppInstanceId}`,
    );

    const [sourceSecrets, targetSecrets] = await Promise.all([
      this.getSecretsByAppInstance(sourceAppInstanceId),
      this.getSecretsByAppInstance(targetAppInstanceId),
    ]);

    const sourceSecret =
      sourceSecrets.find((s) => s.name === secretName) || null;
    const targetSecret =
      targetSecrets.find((s) => s.name === secretName) || null;

    if (!sourceSecret && !targetSecret) {
      throw new NotFoundException(
        `Secret ${secretName} not found in either instance`,
      );
    }

    // Generate detailed comparison with individual key analysis
    return this.createDetailedSecretComparison(
      secretName,
      sourceSecret,
      targetSecret,
      sourceAppInstanceId,
      targetAppInstanceId,
    );
  }

  private createDetailedSecretComparison(
    secretName: string,
    sourceSecret: SecretData | null,
    targetSecret: SecretData | null,
    sourceAppInstanceId: string,
    targetAppInstanceId: string,
  ) {
    // Get all unique keys from both secrets
    const sourceKeys = sourceSecret?.dataKeys || [];
    const targetKeys = targetSecret?.dataKeys || [];
    const allKeys = [...new Set([...sourceKeys, ...targetKeys])];

    // Create key-by-key comparison
    const keyComparisons = allKeys.map((key) => {
      const sourceExists = sourceKeys.includes(key);
      const targetExists = targetKeys.includes(key);
      const sourceValue = sourceSecret?.data?.[key];
      const targetValue = targetSecret?.data?.[key];

      // For security, we only compare if values are different, not the actual values
      const isDifferent =
        sourceExists && targetExists && sourceValue !== targetValue;
      const missingInSource = !sourceExists && targetExists;
      const missingInTarget = sourceExists && !targetExists;
      const identical =
        sourceExists && targetExists && sourceValue === targetValue;

      return {
        key,
        sourceExists,
        targetExists,
        isDifferent,
        missingInSource,
        missingInTarget,
        identical,
      };
    });

    // Calculate summary
    const summary = {
      totalKeys: keyComparisons.length,
      identical: keyComparisons.filter((k) => k.identical).length,
      different: keyComparisons.filter((k) => k.isDifferent).length,
      missingInSource: keyComparisons.filter((k) => k.missingInSource).length,
      missingInTarget: keyComparisons.filter((k) => k.missingInTarget).length,
    };

    return {
      secretName,
      sourceAppInstanceId,
      targetAppInstanceId,
      source: sourceSecret,
      target: targetSecret,
      keyComparisons,
      summary,
    };
  }

  async syncSecretKey(
    syncData: {
      sourceAppInstanceId: string;
      targetAppInstanceId: string;
      secretName: string;
      key: string;
      value: string;
    },
    initiatedBy: string,
  ) {
    this.logger.debug(`Syncing secret key: ${syncData.key}`);

    const targetAppInstance = await this.appInstanceRepository.findOne({
      where: { id: syncData.targetAppInstanceId },
      relations: ['rancherSite'],
    });

    if (!targetAppInstance) {
      throw new NotFoundException('Target app instance not found');
    }

    // Create sync operation record following the same pattern as ConfigMaps
    const syncOperation = this.syncOperationRepository.create({
      sourceEnvironmentId: syncData.sourceAppInstanceId,
      targetEnvironmentId: syncData.targetAppInstanceId,
      serviceIds: [syncData.secretName],
      status: 'pending',
      startTime: new Date(),
      initiatedBy: initiatedBy || 'system',
    });

    const savedOperation =
      await this.syncOperationRepository.save(syncOperation);

    try {
      // Update the secret key
      await this.rancherApiService.updateSecretKey(
        targetAppInstance.rancherSite,
        targetAppInstance.cluster,
        targetAppInstance.namespace,
        syncData.secretName,
        syncData.key,
        syncData.value,
      );

      // Record successful sync in history
      await this.syncHistoryRepository.save({
        syncOperationId: savedOperation.id,
        serviceId: syncData.secretName, // Use secretName as serviceId
        serviceName: syncData.secretName,
        sourceEnvironmentId: syncData.sourceAppInstanceId,
        targetEnvironmentId: syncData.targetAppInstanceId,
        sourceAppInstanceId: syncData.sourceAppInstanceId,
        targetAppInstanceId: syncData.targetAppInstanceId,
        initiatedBy: initiatedBy || 'system',
        timestamp: new Date(),
        configChanges: JSON.stringify({
          key: syncData.key,
          action: 'update',
        }),
        status: 'success',
        resourceType: 'secret',
        resourceName: syncData.secretName,
      });

      // Update sync operation status
      savedOperation.status = 'completed';
      savedOperation.endTime = new Date();
      await this.syncOperationRepository.save(savedOperation);

      return { success: true, message: 'Secret key synced successfully' };
    } catch (error) {
      this.logger.error(
        `Error syncing secret key: ${error.message}`,
        error.stack,
      );

      // Update sync operation status
      savedOperation.status = 'failed';
      savedOperation.endTime = new Date();
      await this.syncOperationRepository.save(savedOperation);

      throw error;
    }
  }

  async syncSecretKeys(
    syncData: {
      sourceAppInstanceId: string;
      targetAppInstanceId: string;
      secretName: string;
      keys: Record<string, string>;
    },
    initiatedBy: string,
  ) {
    this.logger.debug(`Syncing secret keys: ${Object.keys(syncData.keys)}`);

    const targetAppInstance = await this.appInstanceRepository.findOne({
      where: { id: syncData.targetAppInstanceId },
      relations: ['rancherSite'],
    });

    if (!targetAppInstance) {
      throw new NotFoundException('Target app instance not found');
    }

    // Create sync operation record following the same pattern as ConfigMaps
    const syncOperation = this.syncOperationRepository.create({
      sourceEnvironmentId: syncData.sourceAppInstanceId,
      targetEnvironmentId: syncData.targetAppInstanceId,
      serviceIds: [syncData.secretName],
      status: 'pending',
      startTime: new Date(),
      initiatedBy: initiatedBy || 'system',
    });

    const savedOperation =
      await this.syncOperationRepository.save(syncOperation);

    try {
      // Update the secret keys
      await this.rancherApiService.syncSecretKeys(
        targetAppInstance.rancherSite,
        targetAppInstance.cluster,
        targetAppInstance.namespace,
        syncData.secretName,
        syncData.keys,
      );

      // Record successful sync in history for each key
      for (const key of Object.keys(syncData.keys)) {
        await this.syncHistoryRepository.save({
          syncOperationId: savedOperation.id,
          serviceId: syncData.secretName,
          serviceName: syncData.secretName,
          sourceEnvironmentId: syncData.sourceAppInstanceId,
          targetEnvironmentId: syncData.targetAppInstanceId,
          sourceAppInstanceId: syncData.sourceAppInstanceId,
          targetAppInstanceId: syncData.targetAppInstanceId,
          initiatedBy: initiatedBy || 'system',
          timestamp: new Date(),
          configChanges: JSON.stringify({
            key,
            action: 'update',
          }),
          status: 'success',
          resourceType: 'secret',
          resourceName: syncData.secretName,
        });
      }

      // Update sync operation status
      savedOperation.status = 'completed';
      savedOperation.endTime = new Date();
      await this.syncOperationRepository.save(savedOperation);

      return { success: true, message: 'Secret keys synced successfully' };
    } catch (error) {
      this.logger.error(
        `Error syncing secret keys: ${error.message}`,
        error.stack,
      );

      // Update sync operation status
      savedOperation.status = 'failed';
      savedOperation.endTime = new Date();
      await this.syncOperationRepository.save(savedOperation);

      throw error;
    }
  }
}
