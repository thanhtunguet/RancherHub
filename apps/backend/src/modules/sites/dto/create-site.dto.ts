import { IsString, IsUrl, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSiteDto {
  @ApiProperty({
    example: 'Production Rancher',
    description: 'Display name for the Rancher site',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({
    example: 'https://rancher.example.com',
    description: 'Rancher server URL',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    example: 'token-abc123:xyz789',
    description: 'Rancher API token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}