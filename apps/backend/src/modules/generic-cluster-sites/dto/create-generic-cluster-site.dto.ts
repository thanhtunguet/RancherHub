import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGenericClusterSiteDto {
  @ApiProperty({
    example: 'Production EKS Cluster',
    description: 'Display name for the generic Kubernetes cluster',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({
    example: 'apiVersion: v1\nkind: Config\nclusters:\n...',
    description: 'Kubeconfig file content in YAML format',
  })
  @IsString()
  @IsNotEmpty()
  kubeconfig: string;
}
