import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteUserDto {
  @ApiProperty({
    example: '123456',
    description:
      "2FA token from admin's authenticator app (required for deleting users)",
  })
  @IsString()
  @IsNotEmpty()
  adminTwoFactorToken: string;
}
