import {
  IsString,
  IsNotEmpty,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const K8S_NAME_PATTERN = /^[a-z0-9]([a-z0-9\-.]{0,251}[a-z0-9])?$/;

export class SyncConfigMapKeyDto {
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

  @ApiProperty({ description: 'ConfigMap data key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  key: string;

  @ApiProperty({ description: 'Value to set for the key' })
  @IsString()
  @MaxLength(1_048_576) // 1 MB cap
  value: string;
}
