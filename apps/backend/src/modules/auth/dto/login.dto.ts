import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Username or email' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: '2FA token (6 digits)' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  twoFactorToken?: string;

  @ApiPropertyOptional({
    description: 'Device fingerprint for trusted device check',
  })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({
    description: 'Device name (e.g., Chrome 120 on macOS)',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Trust this device for 30 days (skip 2FA)',
  })
  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;
}
