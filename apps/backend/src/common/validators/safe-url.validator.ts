import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Hostnames that are unconditionally blocked regardless of context.
 * Cloud metadata endpoints that must never be used as a Rancher site URL.
 */
const BLOCKED_HOSTNAMES = new Set([
  // Cloud instance metadata services
  '169.254.169.254', // AWS/Azure IMDS v1
  '169.254.170.2', // AWS ECS credential provider
  'metadata.google.internal', // GCP metadata
  'metadata.internal', // generic cloud metadata alias

  // Loopback / unspecified as explicit hostnames
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

/**
 * Return true when the hostname resolves to a loopback address.
 * This covers the 127.0.0.0/8 range and IPv6 ::1, which would point
 * the backend at itself and allow reading its own services.
 *
 * Private ranges (10/8, 172.16/12, 192.168/16) are intentionally allowed
 * because on-premise Rancher deployments on internal networks are the
 * primary use case for this application.
 */
function isLoopback(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(lower)) return true;

  // IPv4 loopback: 127.0.0.0/8
  const parts = lower.split('.');
  if (parts.length === 4) {
    const first = Number(parts[0]);
    if (Number.isInteger(first) && first === 127) return true;
  }

  return false;
}

/**
 * Parse and normalise a raw site URL into a safe origin-only base URL.
 *
 * Enforces:
 * - http:// or https:// scheme only (blocks file://, javascript:, gopher:/, etc.)
 * - Blocks loopback addresses (127.x.x.x, ::1, localhost, 0.0.0.0) to prevent
 *   the backend from being pointed at itself.
 * - Blocks known cloud metadata hostnames (169.254.169.254, etc.)
 * - Strips any path, query string, or fragment so the stored value is always
 *   a bare origin (e.g. "https://rancher.example.com" or
 *   "https://rancher.internal:8443").
 *
 * Private IP ranges (10/8, 172.16/12, 192.168/16) are permitted because
 * on-premise Rancher installations routinely live on internal networks.
 *
 * @throws BadRequestException on any validation failure.
 */
export function parseSafeBaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException(`Invalid URL: "${raw}"`);
  }

  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    throw new BadRequestException(
      `URL scheme "${url.protocol}" is not allowed. Only http:// and https:// are accepted.`,
    );
  }

  if (isLoopback(url.hostname)) {
    throw new BadRequestException(
      `URL hostname "${url.hostname}" is not permitted (loopback / metadata endpoint).`,
    );
  }

  // Return origin-only: strips path, query, fragment.
  // new URL(url.origin) re-parses to guarantee no trailing content.
  return new URL(url.origin);
}

@ValidatorConstraint({ name: 'isSafeRancherUrl', async: false })
export class IsSafeRancherUrlConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;
    try {
      parseSafeBaseUrl(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      `${args.property} must be a valid http:// or https:// URL ` +
      `(loopback, metadata endpoints, and non-http schemes are blocked; ` +
      `path/query/fragment will be stripped)`
    );
  }
}

export function IsSafeRancherUrl(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsSafeRancherUrlConstraint,
    });
}
