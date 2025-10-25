import { ApiProperty } from '@nestjs/swagger';

export class Setup2FADto {
  @ApiProperty({ description: 'Base32 encoded secret for manual entry' })
  secret: string;

  @ApiProperty({ description: 'QR code as data URL for scanning' })
  qrCode: string;
}