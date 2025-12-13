import { ApiProperty } from '@nestjs/swagger';

export class TrustedDeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceName: string;

  @ApiProperty()
  ipAddress: string | null;

  @ApiProperty()
  lastUsedAt: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isCurrentDevice: boolean;
}
