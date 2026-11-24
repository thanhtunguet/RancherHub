function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `legacy-${Math.abs(hash).toString(16)}`;
}

async function sha256Hex(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    return hashString(input);
  }

  const encoded = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getDeviceFingerprint(): Promise<string> {
  const seed = [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    String(navigator.hardwareConcurrency ?? ""),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  return sha256Hex(seed);
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;

  let browser = "Unknown Browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  const versionMatch = ua.match(/(?:Chrome|Firefox|Safari|Edg)\/(\d+)/);
  const version = versionMatch?.[1] ?? "";
  return `${browser}${version ? ` ${version}` : ""} on ${os}`;
}
