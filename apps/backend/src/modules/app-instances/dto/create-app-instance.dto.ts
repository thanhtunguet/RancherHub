import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Rancher cluster ID',
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
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the associated Rancher site',
  })
  @IsUUID()
  @IsNotEmpty()
  rancherSiteId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'ID of the associated environment',
  })
  @IsUUID()
  @IsNotEmpty()
  environmentId: string;
}