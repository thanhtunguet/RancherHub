import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark endpoints that should allow access without 2FA.
 * Use this for:
 * - 2FA setup endpoints (setup-2fa, verify-2fa)
 * - Password change endpoint (so users can secure their account)
 * - Profile endpoint (to check their 2FA status)
 *
 * All other endpoints will require 2FA by default when Require2FAGuard is applied.
 */
export const AllowWithout2FA = () => SetMetadata('allowWithout2FA', true);
