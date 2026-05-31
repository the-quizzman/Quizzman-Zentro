/**
 * @qmf/utils - Mobile Detection Service
 * Detects device capability tier (low/mid/high) to enable adaptive rendering.
 * Uses hardware concurrency, device memory, connection type, and screen size.
 */

export type DeviceTier = 'low' | 'mid' | 'high';

export interface DeviceCapability {
  tier: DeviceTier;
  cores: number;
  memoryGB: number | null;
  isMobile: boolean;
  isTouchDevice: boolean;
  connectionType: string | null;
  prefersReducedMotion: boolean;
  screenWidth: number;
  devicePixelRatio: number;
}

let _cachedCapability: DeviceCapability | null = null;

/**
 * Detect device capability. Result is memoized for the session.
 */
export function detectDevice(): DeviceCapability {
  if (_cachedCapability) return _cachedCapability;

  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const win = typeof window !== 'undefined' ? window : null;

  const cores = nav?.hardwareConcurrency ?? 4;
  const memoryGB = (nav as unknown as { deviceMemory?: number })?.deviceMemory ?? null;
  const connection = (nav as unknown as { connection?: { effectiveType?: string } })?.connection;
  const connectionType = connection?.effectiveType ?? null;
  const isTouchDevice = win ? ('ontouchstart' in win || nav!.maxTouchPoints > 0) : false;
  const screenWidth = win?.screen?.width ?? 1920;
  const devicePixelRatio = win?.devicePixelRatio ?? 1;
  const prefersReducedMotion = win
    ? win.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const isMobile = isTouchDevice && screenWidth < 768;

  // Scoring: 0-2 = low, 3-5 = mid, 6+ = high
  let score = 0;
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 0;

  if (memoryGB !== null) {
    if (memoryGB >= 8) score += 3;
    else if (memoryGB >= 4) score += 2;
    else if (memoryGB >= 2) score += 1;
  } else {
    score += 1; // assume mid when unknown
  }

  if (connectionType === '4g' || connectionType === null) score += 1;
  else if (connectionType === '3g') score += 0;
  else score -= 1; // 2g or slow-2g

  if (prefersReducedMotion) score -= 1;

  let tier: DeviceTier;
  if (score <= 2) tier = 'low';
  else if (score <= 5) tier = 'mid';
  else tier = 'high';

  _cachedCapability = {
    tier,
    cores,
    memoryGB,
    isMobile,
    isTouchDevice,
    connectionType,
    prefersReducedMotion,
    screenWidth,
    devicePixelRatio,
  };

  return _cachedCapability;
}

/**
 * Apply device-tier CSS class and data attribute to document root.
 * This enables CSS-based adaptive rendering:
 *   [data-device-tier="low"] .heavy-animation { animation: none; }
 */
export function applyDeviceTier(): DeviceTier {
  const cap = detectDevice();
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-device-tier', cap.tier);
    root.setAttribute('data-mobile', String(cap.isMobile));
    if (cap.prefersReducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    }
  }
  return cap.tier;
}

/**
 * Check if heavy effects should be enabled.
 */
export function shouldEnableHeavyEffects(): boolean {
  const cap = detectDevice();
  return cap.tier === 'high' && !cap.prefersReducedMotion;
}

/**
 * Reset cached detection (useful for tests).
 */
export function resetDeviceDetection(): void {
  _cachedCapability = null;
}
