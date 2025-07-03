import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncServicesDto {
  @ApiProperty({
    description: 'Source environment ID',
    example: 'env-123',
  })
  @IsString()
  @IsNotEmpty()
  sourceEnvironmentId: string;

  @ApiProperty({
    description: 'Target environment ID',
    example: 'env-456',
  })
  @IsString()
  @IsNotEmpty()
  targetEnvironmentId: string;

  @ApiProperty({
    description: 'Array of service IDs to synchronize',
    example: ['service-1', 'service-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];

  @ApiProperty({
    description: 'Array of target app instance IDs (services will be synced to all selected instances)',
    example: ['app-instance-1', 'app-instance-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  targetAppInstanceIds: string[];
}