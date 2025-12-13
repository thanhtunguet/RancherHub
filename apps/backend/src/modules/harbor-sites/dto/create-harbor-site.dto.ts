import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHarborSiteDto {
  @ApiProperty({ description: 'Name of the Harbor site' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Harbor registry URL' })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Harbor username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: 'Harbor password' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ description: 'Whether the site is active', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
