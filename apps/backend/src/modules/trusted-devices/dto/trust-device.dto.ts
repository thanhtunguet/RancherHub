import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrustDeviceDto {
  @ApiProperty({ description: 'Device fingerprint ID' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;

  @ApiProperty({ description: 'Device name (e.g., Chrome 120 on macOS)' })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsString()
  @IsOptional()
  userAgent?: string;
}
