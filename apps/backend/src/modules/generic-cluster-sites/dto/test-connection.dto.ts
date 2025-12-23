import { ApiProperty } from '@nestjs/swagger';

export class TestConnectionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Connection successful' })
  message: string;

  @ApiProperty({
    example: {
      serverVersion: 'v1.28.0',
      clusterName: 'production-eks',
    },
    required: false,
  })
  data?: {
    serverVersion?: string;
    clusterName?: string;
  };
}
