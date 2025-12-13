import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class Disable2FADto {
  @ApiProperty({
    description:
      '6-digit 2FA token from authenticator app to confirm disabling',
  })
  @IsNotEmpty({ message: 'Token is required' })
  @IsString()
  @Length(6, 6, { message: 'Token must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Token must contain only numbers' })
  token: string;
}
