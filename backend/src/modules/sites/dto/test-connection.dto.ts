import { ApiProperty } from '@nestjs/swagger';

export class TestConnectionResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the connection test was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'Connection successful',
    description: 'Message describing the test result',
  })
  message: string;

  @ApiProperty({
    example: { clusters: 5, projects: 12 },
    description: 'Additional information about the Rancher instance',
    required: false,
  })
  data?: any;
}