import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Require2FAGuard } from './guards/require-2fa.guard';
import { AllowWithout2FA } from './decorators/allow-without-2fa.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Ip() ipAddress: string) {
    return this.authService.login(loginDto, ipAddress);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('setup-2fa')
  @UseGuards(JwtAuthGuard, Require2FAGuard)
  @AllowWithout2FA()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA for authenticated user' })
  @ApiResponse({ status: 200, description: '2FA setup initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setup2FA(@Request() req) {
    return this.authService.setup2FA(req.user.userId);
  }

  @Post('verify-2fa')
  @UseGuards(JwtAuthGuard, Require2FAGuard)
  @AllowWithout2FA()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA verified and enabled' })
  @ApiResponse({ status: 400, description: 'Invalid 2FA token' })
  async verify2FA(@Request() req, @Body() verify2FADto: Verify2FADto) {
    const isValid = await this.authService.verify2FA(
      req.user.userId,
      verify2FADto,
    );
    return {
      success: isValid,
      message: isValid ? '2FA enabled successfully' : 'Invalid token',
    };
  }

  @Post('disable-2fa')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Disable 2FA for authenticated user (requires 2FA token verification)',
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or invalid 2FA token',
  })
  @ApiResponse({ status: 400, description: '2FA not enabled or invalid token' })
  async disable2FA(@Request() req, @Body() disable2FADto: Disable2FADto) {
    await this.authService.disable2FA(req.user.userId, disable2FADto.token);
    return { success: true, message: '2FA disabled successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, Require2FAGuard)
  @AllowWithout2FA()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or incorrect current password',
  })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { success: true, message: 'Password changed successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, Require2FAGuard)
  @AllowWithout2FA()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const user = await this.authService.findById(req.user.userId);
    if (!user) {
      return null;
    }

    const profile: any = { ...user };
    delete profile.password;
    delete profile.twoFactorSecret;
    return profile;
  }
}
