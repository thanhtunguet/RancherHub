import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestHarborConnectionDto {
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
}