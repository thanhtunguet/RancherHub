import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

/**
 * Guard that ensures the authenticated user has 2FA enabled.
 * Returns 403 Forbidden if user hasn't enabled 2FA.
 *
 * This provides defense-in-depth security by enforcing 2FA at the API level,
 * preventing access even if frontend checks are bypassed.
 */
@Injectable()
export class Require2FAGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is marked as allowing access without 2FA
    const allowWithout2FA = this.reflector.getAllAndOverride<boolean>('allowWithout2FA', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowWithout2FA) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch the user from database to check 2FA status
    const user = await this.authService.findById(userId);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if user has 2FA enabled
    if (!user.twoFactorEnabled) {
      throw new ForbiddenException(
        'Two-factor authentication is required to access this resource. Please enable 2FA in your account settings.'
      );
    }

    return true;
  }
}
