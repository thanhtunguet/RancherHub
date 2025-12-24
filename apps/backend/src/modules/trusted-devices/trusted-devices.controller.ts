import {
  Controller,
  Get,
  Delete,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TrustedDevicesService } from './trusted-devices.service';
import { TrustedDeviceResponseDto } from './dto/trusted-device-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/trusted-devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Trusted Devices')
export class TrustedDevicesController {
  constructor(private readonly trustedDevicesService: TrustedDevicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all trusted devices for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of trusted devices',
    type: [TrustedDeviceResponseDto],
  })
  async getTrustedDevices(@Request() req): Promise<TrustedDeviceResponseDto[]> {
    const userId = req.user.userId;
    const devices =
      await this.trustedDevicesService.getUserTrustedDevices(userId);

    // Get current device fingerprint from request if available
    const currentFingerprint = req.body?.deviceFingerprint;

    return devices.map((device) => ({
      id: device.id,
      deviceName: device.deviceName,
      ipAddress: device.ipAddress,
      lastUsedAt: device.lastUsedAt,
      expiresAt: device.expiresAt,
      createdAt: device.createdAt,
      isCurrentDevice: currentFingerprint
        ? device.deviceFingerprint === currentFingerprint
        : false,
    }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a specific trusted device' })
  @ApiResponse({
    status: 200,
    description: 'Device revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async revokeDevice(
    @Request() req,
    @Param('id') deviceId: string,
  ): Promise<{ success: boolean }> {
    const userId = req.user.userId;
    await this.trustedDevicesService.revokeDevice(userId, deviceId);
    return { success: true };
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke all trusted devices' })
  @ApiResponse({
    status: 200,
    description: 'All devices revoked successfully',
  })
  async revokeAllDevices(
    @Request() req,
  ): Promise<{ success: boolean; count: number }> {
    const userId = req.user.userId;
    const count = await this.trustedDevicesService.revokeAllUserDevices(userId);
    return { success: true, count };
  }
}
