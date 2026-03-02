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

export class SyncSecretKeysDto {
  @ApiProperty({ description: 'Source app instance ID' })
  @IsUUID()
  sourceAppInstanceId: string;

  @ApiProperty({ description: 'Target app instance ID' })
  @IsUUID()
  targetAppInstanceId: string;

  @ApiProperty({ description: 'Secret name (Kubernetes DNS subdomain)' })
  @IsString()
  @IsNotEmpty()
  @Matches(K8S_NAME_PATTERN, {
    message:
      'secretName must be a valid Kubernetes resource name (lowercase alphanumeric, hyphens, dots)',
  })
  secretName: string;

  @ApiProperty({
    description:
      'Map of key-value pairs to sync into the Secret (values are base64-encoded)',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsDefined({ message: 'keys must be provided' })
  @IsObject({ message: 'keys must be a plain object' })
  keys: Record<string, string>;
}
