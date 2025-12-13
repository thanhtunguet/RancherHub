import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;

/**
 * Get a stable device fingerprint using FingerprintJS
 * The fingerprint is stable across page reloads but may change with major browser updates
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }

  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
}

/**
 * Parse user agent to get a human-readable device name
 * Returns format: "Browser Version on OS"
 * Example: "Chrome 120 on macOS"
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;

  // Extract browser
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
  }

  // Extract OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iOS')) {
    os = 'iOS';
  }

  // Extract version (simplified)
  const versionMatch = ua.match(/(?:Chrome|Firefox|Safari|Edg)\/(\d+)/);
  const version = versionMatch ? versionMatch[1] : '';

  return `${browser}${version ? ' ' + version : ''} on ${os}`;
}
