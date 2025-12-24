import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppInstanceDto {
  @ApiProperty({
    example: 'Web Frontend Dev',
    description: 'Display name for the app instance',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'c-12345:p-67890',
    description:
      'Cluster ID (Rancher cluster ID for Rancher, cluster name for generic)',
  })
  @IsString()
  @IsNotEmpty()
  cluster: string;

  @ApiProperty({
    example: 'frontend-dev',
    description: 'Kubernetes namespace',
  })
  @IsString()
  @IsNotEmpty()
  namespace: string;

  @ApiProperty({
    example: 'rancher',
    description: 'Type of cluster: rancher or generic',
    enum: ['rancher', 'generic'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['rancher', 'generic'])
  clusterType: 'rancher' | 'generic';

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'ID of the associated Rancher site (required for rancher cluster type)',
  })
  @ValidateIf((o) => o.clusterType === 'rancher')
  @IsUUID()
  @IsNotEmpty()
  @IsOptional()
  rancherSiteId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description:
      'ID of the associated generic cluster site (required for generic cluster type)',
  })
  @ValidateIf((o) => o.clusterType === 'generic')
  @IsUUID()
  @IsNotEmpty()
  @IsOptional()
  genericClusterSiteId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'ID of the associated environment',
  })
  @IsUUID()
  @IsNotEmpty()
  environmentId: string;
}
