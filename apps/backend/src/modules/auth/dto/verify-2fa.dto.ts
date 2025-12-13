import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({ description: '6-digit 2FA token from authenticator app' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}
