import { IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMonitoredInstanceDto {
  @ApiProperty({
    description: 'ID of the app instance to monitor',
    example: 'app-instance-uuid',
  })
  @IsString()
  appInstanceId: string;

  @ApiProperty({
    description: 'Enable or disable monitoring for this instance',
    example: true,
    default: true,
  })
  @IsBoolean()
  monitoringEnabled: boolean = true;

  @ApiProperty({
    description: 'Interval in minutes between health checks',
    example: 60,
    default: 60,
  })
  @IsNumber()
  checkIntervalMinutes: number = 60;
}