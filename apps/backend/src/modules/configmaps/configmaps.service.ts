import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppInstance } from '../../entities';
import { RancherApiService } from '../../services/rancher-api.service';

export interface ConfigMapData {
  id: string;
  name: string;
  namespace: string;
  data: Record<string, string>;
  binaryData: Record<string, string>;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  creationTimestamp: string;
  resourceVersion: string;
  dataKeys: string[];
  dataSize: number;
  appInstanceId: string;
}

export interface ConfigMapComparison {
  configMapName: string;
  source: ConfigMapData | null;
  target: ConfigMapData | null;
  differences: {
    existence: boolean;
    data: boolean;
    labels: boolean;
    annotations: boolean;
    dataKeys: string[];
    changedKeys: string[];
  };
  status: string;
  differenceType: string;
}

export interface ConfigMapComparisonResult {
  sourceAppInstanceId: string;
  targetAppInstanceId: string;
  summary: {
    totalConfigMaps: number;
    identical: number;
    different: number;
    missingInSource: number;
    missingInTarget: number;
  };
  comparisons: ConfigMapComparison[];
}

@Injectable()
export class ConfigMapsService {
  private readonly logger = new Logger(ConfigMapsService.name);

  constructor(
    @InjectRepository(AppInstance)
    private readonly appInstanceRepository: Repository<AppInstance>,
    private readonly rancherApiService: RancherApiService,
  ) {}

  async getConfigMapsByAppInstance(appInstanceId: string): Promise<ConfigMapData[]> {
    this.logger.debug(`Getting ConfigMaps for app instance: ${appInstanceId}`);

    const appInstance = await this.appInstanceRepository.findOne({
      where: { id: appInstanceId },
      relations: ['rancherSite'],
    });

    if (!appInstance) {
      throw new NotFoundException(`App instance with ID ${appInstanceId} not found`);
    }

    this.logger.debug(`Found app instance: ${appInstance.name} in cluster: ${appInstance.cluster}, namespace: ${appInstance.namespace}`);

    const configMaps = await this.rancherApiService.getConfigMapsFromK8sApi(
      appInstance.rancherSite,
      appInstance.cluster,
      appInstance.namespace,
    );

    return configMaps.map(cm => ({
      ...cm,
      appInstanceId,
    }));
  }

  async compareConfigMapsByInstance(
    sourceAppInstanceId: string,
    targetAppInstanceId: string,
  ): Promise<ConfigMapComparisonResult> {
    this.logger.debug(`Comparing ConfigMaps between app instances: ${sourceAppInstanceId} -> ${targetAppInstanceId}`);

    // Fetch ConfigMaps from both app instances
    const [sourceConfigMaps, targetConfigMaps] = await Promise.all([
      this.getConfigMapsByAppInstance(sourceAppInstanceId),
      this.getConfigMapsByAppInstance(targetAppInstanceId),
    ]);

    this.logger.debug(`Source ConfigMaps: ${sourceConfigMaps.length}, Target ConfigMaps: ${targetConfigMaps.length}`);

    // Create maps for quick lookup
    const sourceConfigMapMap = new Map(sourceConfigMaps.map(cm => [cm.name, cm]));
    const targetConfigMapMap = new Map(targetConfigMaps.map(cm => [cm.name, cm]));

    // Get all unique ConfigMap names
    const allConfigMapNames = new Set([
      ...sourceConfigMaps.map(cm => cm.name),
      ...targetConfigMaps.map(cm => cm.name),
    ]);

    const comparisons: ConfigMapComparison[] = [];

    for (const configMapName of allConfigMapNames) {
      const sourceConfigMap = sourceConfigMapMap.get(configMapName);
      const targetConfigMap = targetConfigMapMap.get(configMapName);

      const comparison = this.createConfigMapComparison(
        configMapName,
        sourceConfigMap,
        targetConfigMap,
      );

      comparisons.push(comparison);
    }

    // Sort comparisons by differenceType priority then by ConfigMap name
    comparisons.sort((a, b) => {
      if (a.differenceType !== b.differenceType) {
        const statusOrder = { 'missing_in_source': 0, 'missing_in_target': 1, 'different': 2, 'identical': 3 };
        return statusOrder[a.differenceType] - statusOrder[b.differenceType];
      }
      return a.configMapName.localeCompare(b.configMapName);
    });

    const summary = {
      totalConfigMaps: allConfigMapNames.size,
      identical: comparisons.filter(c => c.differenceType === 'identical').length,
      different: comparisons.filter(c => c.differenceType === 'different').length,
      missingInSource: comparisons.filter(c => c.differenceType === 'missing_in_source').length,
      missingInTarget: comparisons.filter(c => c.differenceType === 'missing_in_target').length,
    };

    return {
      sourceAppInstanceId,
      targetAppInstanceId,
      summary,
      comparisons,
    };
  }

  private createConfigMapComparison(
    configMapName: string,
    sourceConfigMap: ConfigMapData | undefined,
    targetConfigMap: ConfigMapData | undefined,
  ): ConfigMapComparison {
    const differences = this.calculateDifferences(sourceConfigMap, targetConfigMap);
    
    return {
      configMapName,
      source: sourceConfigMap || null,
      target: targetConfigMap || null,
      differences,
      status: this.getComparisonStatus(sourceConfigMap, targetConfigMap),
      differenceType: this.getDifferenceType(sourceConfigMap, targetConfigMap),
    };
  }

  private calculateDifferences(
    sourceConfigMap: ConfigMapData | undefined,
    targetConfigMap: ConfigMapData | undefined,
  ) {
    if (!sourceConfigMap || !targetConfigMap) {
      return {
        existence: true,
        data: false,
        labels: false,
        annotations: false,
        dataKeys: [],
        changedKeys: [],
      };
    }

    // Compare data keys
    const sourceKeys = new Set(Object.keys(sourceConfigMap.data || {}));
    const targetKeys = new Set(Object.keys(targetConfigMap.data || {}));
    const allKeys = new Set([...sourceKeys, ...targetKeys]);
    
    const dataKeys: string[] = [];
    const changedKeys: string[] = [];

    for (const key of allKeys) {
      if (!sourceKeys.has(key) || !targetKeys.has(key)) {
        dataKeys.push(key);
      } else if (sourceConfigMap.data[key] !== targetConfigMap.data[key]) {
        changedKeys.push(key);
      }
    }

    return {
      existence: false,
      data: changedKeys.length > 0 || dataKeys.length > 0,
      labels: JSON.stringify(sourceConfigMap.labels || {}) !== JSON.stringify(targetConfigMap.labels || {}),
      annotations: JSON.stringify(sourceConfigMap.annotations || {}) !== JSON.stringify(targetConfigMap.annotations || {}),
      dataKeys,
      changedKeys,
    };
  }

  private getComparisonStatus(
    sourceConfigMap: ConfigMapData | undefined,
    targetConfigMap: ConfigMapData | undefined,
  ): string {
    if (!sourceConfigMap || !targetConfigMap) {
      return 'missing';
    }

    const differences = this.calculateDifferences(sourceConfigMap, targetConfigMap);
    
    if (differences.data || differences.labels || differences.annotations) {
      return 'different';
    }

    return 'identical';
  }

  private getDifferenceType(
    sourceConfigMap: ConfigMapData | undefined,
    targetConfigMap: ConfigMapData | undefined,
  ): string {
    if (!sourceConfigMap && targetConfigMap) {
      return 'missing_in_source';
    }
    if (sourceConfigMap && !targetConfigMap) {
      return 'missing_in_target';
    }
    if (sourceConfigMap && targetConfigMap) {
      const differences = this.calculateDifferences(sourceConfigMap, targetConfigMap);
      if (differences.data || differences.labels || differences.annotations) {
        return 'different';
      }
    }
    return 'identical';
  }
}