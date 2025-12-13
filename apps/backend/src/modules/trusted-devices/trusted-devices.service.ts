import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { TrustedDevice } from '../../entities/trusted-device.entity';
import { TrustDeviceDto } from './dto/trust-device.dto';

@Injectable()
export class TrustedDevicesService {
  constructor(
    @InjectRepository(TrustedDevice)
    private trustedDeviceRepository: Repository<TrustedDevice>,
  ) {}

  /**
   * Check if a device is trusted and not expired
   */
  async isDeviceTrusted(
    userId: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    const device = await this.trustedDeviceRepository.findOne({
      where: {
        userId,
        deviceFingerprint,
      },
    });

    if (!device) {
      return false;
    }

    // Check if device has expired
    if (new Date() > device.expiresAt) {
      // Device expired, remove it
      await this.trustedDeviceRepository.remove(device);
      return false;
    }

    return true;
  }

  /**
   * Trust a new device (enforces 3 device limit)
   */
  async trustDevice(
    userId: string,
    trustDeviceDto: TrustDeviceDto,
    ipAddress: string | null,
  ): Promise<TrustedDevice> {
    // Check if device already exists
    const existingDevice = await this.trustedDeviceRepository.findOne({
      where: {
        userId,
        deviceFingerprint: trustDeviceDto.deviceFingerprint,
      },
    });

    // If device exists, update it instead of creating new
    if (existingDevice) {
      existingDevice.lastUsedAt = new Date();
      existingDevice.expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ); // 30 days from now
      existingDevice.deviceName = trustDeviceDto.deviceName;
      existingDevice.ipAddress = ipAddress;
      existingDevice.userAgent = trustDeviceDto.userAgent || null;
      return await this.trustedDeviceRepository.save(existingDevice);
    }

    // Enforce device limit before creating new device
    await this.enforceDeviceLimit(userId);

    // Create new trusted device
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const device = this.trustedDeviceRepository.create({
      userId,
      deviceFingerprint: trustDeviceDto.deviceFingerprint,
      deviceName: trustDeviceDto.deviceName,
      ipAddress,
      userAgent: trustDeviceDto.userAgent || null,
      lastUsedAt: now,
      expiresAt,
    });

    return await this.trustedDeviceRepository.save(device);
  }

  /**
   * Get all trusted devices for a user
   */
  async getUserTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    return await this.trustedDeviceRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke a specific device
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.trustedDeviceRepository.remove(device);
  }

  /**
   * Revoke all devices for a user (called on password change)
   */
  async revokeAllUserDevices(userId: string): Promise<number> {
    const result = await this.trustedDeviceRepository.delete({ userId });
    return result.affected || 0;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(
    userId: string,
    deviceFingerprint: string,
  ): Promise<void> {
    await this.trustedDeviceRepository.update(
      { userId, deviceFingerprint },
      { lastUsedAt: new Date() },
    );
  }

  /**
   * Cleanup expired devices (runs daily at midnight)
   */
  @Cron('0 0 * * *')
  async cleanupExpiredDevices(): Promise<void> {
    const result = await this.trustedDeviceRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected && result.affected > 0) {
      console.log(`Cleaned up ${result.affected} expired trusted devices`);
    }
  }

  /**
   * Enforce 3 device limit (remove oldest when adding new)
   */
  private async enforceDeviceLimit(userId: string): Promise<void> {
    const devices = await this.trustedDeviceRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    // If user already has 3 or more devices, remove the oldest ones
    if (devices.length >= 3) {
      const devicesToRemove = devices.slice(0, devices.length - 2);
      await this.trustedDeviceRepository.remove(devicesToRemove);
    }
  }
}
