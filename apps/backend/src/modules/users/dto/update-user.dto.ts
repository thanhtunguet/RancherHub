import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'johndoe', description: 'Username', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'New password',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: true, description: 'Active status', required: false })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    example: '123456',
    description:
      "2FA token from admin's authenticator app (required for updates)",
  })
  @IsString()
  adminTwoFactorToken: string;
}
