import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsObject,
  IsDefined,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const K8S_NAME_PATTERN = /^[a-z0-9]([a-z0-9\-.]{0,251}[a-z0-9])?$/;

export class SyncConfigMapKeysDto {
  @ApiProperty({ description: 'Source app instance ID' })
  @IsUUID()
  sourceAppInstanceId: string;

  @ApiProperty({ description: 'Target app instance ID' })
  @IsUUID()
  targetAppInstanceId: string;

  @ApiProperty({ description: 'ConfigMap name (Kubernetes DNS subdomain)' })
  @IsString()
  @IsNotEmpty()
  @Matches(K8S_NAME_PATTERN, {
    message:
      'configMapName must be a valid Kubernetes resource name (lowercase alphanumeric, hyphens, dots)',
  })
  configMapName: string;

  @ApiProperty({
    description: 'Map of key-value pairs to sync into the ConfigMap',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsDefined({ message: 'keys must be provided' })
  @IsObject({ message: 'keys must be a plain object' })
  keys: Record<string, string>;
}
