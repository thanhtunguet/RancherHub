import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Setup2FADto } from './dto/setup-2fa.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { TrustedDevicesService } from '../trusted-devices/trusted-devices.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => TrustedDevicesService))
    private trustedDevicesService: TrustedDevicesService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
    });

    if (user && (await user.validatePassword(password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, ipAddress?: string) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Check if device is trusted (skip 2FA if trusted and not expired)
    let deviceTrusted = false;
    if (user.twoFactorEnabled && loginDto.deviceFingerprint) {
      deviceTrusted = await this.trustedDevicesService.isDeviceTrusted(
        user.id,
        loginDto.deviceFingerprint,
      );

      if (deviceTrusted) {
        // Update last used timestamp
        await this.trustedDevicesService.updateLastUsed(
          user.id,
          loginDto.deviceFingerprint,
        );
      }
    }

    // If 2FA is enabled, device not trusted, and no token provided - require 2FA
    if (user.twoFactorEnabled && !deviceTrusted && !loginDto.twoFactorToken) {
      return {
        requiresTwoFactor: true,
        message: 'Please enter your 2FA token to complete login',
        tempToken: this.jwtService.sign(
          { sub: user.id, username: user.username, temp: true },
          { expiresIn: '5m' },
        ),
      };
    }

    // Verify 2FA token if provided (and device not trusted)
    if (user.twoFactorEnabled && !deviceTrusted && loginDto.twoFactorToken) {
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: loginDto.twoFactorToken,
        window: 2,
      });

      if (!isValid) {
        throw new UnauthorizedException(
          'Invalid 2FA token. Please check the code from your authenticator app and try again.',
        );
      }

      // If user wants to trust this device, create trusted device record
      if (
        loginDto.trustDevice &&
        loginDto.deviceFingerprint &&
        loginDto.deviceName
      ) {
        await this.trustedDevicesService.trustDevice(
          user.id,
          {
            deviceFingerprint: loginDto.deviceFingerprint,
            deviceName: loginDto.deviceName,
            userAgent: loginDto.userAgent,
          },
          ipAddress || null,
        );
      }
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      isFirstLogin: false,
    });

    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
        isFirstLogin: user.isFirstLogin,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: [{ username: registerDto.username }, { email: registerDto.email }],
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const user = this.userRepository.create({
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
      isFirstLogin: true,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, twoFactorSecret, ...result } = savedUser;
    return result;
  }

  async setup2FA(userId: string): Promise<Setup2FADto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `RancherHub (${user.username})`,
      issuer: 'Rancher Hub',
    });

    // Save the secret (but don't enable 2FA yet)
    await this.userRepository.update(userId, {
      twoFactorSecret: secret.base32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async verify2FA(
    userId: string,
    verify2FADto: Verify2FADto,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA not set up');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: verify2FADto.token,
      window: 2,
    });

    if (isValid) {
      // Enable 2FA for the user
      await this.userRepository.update(userId, {
        twoFactorEnabled: true,
      });
    }

    return isValid;
  }

  async disable2FA(userId: string, token: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }

    // Verify the 2FA token before disabling
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid 2FA token. Please enter the correct code from your authenticator app.',
      );
    }

    // Token is valid, disable 2FA
    await this.userRepository.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update to new password
    user.password = newPassword;
    await this.userRepository.save(user);

    // CRITICAL: Revoke ALL trusted devices when password changes
    await this.trustedDevicesService.revokeAllUserDevices(userId);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
