import { createHash } from 'crypto';

export interface BrowserInfo {
  userAgent?: string;
  language?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  cookieEnabled?: boolean;
  doNotTrack?: string;
  plugins?: string[];
  canvas?: string;
  webgl?: string;
  [key: string]: any;
}

export class FingerprintUtil {
  /**
   * Generate a unique fingerprint based on browser information and domain
   * @param browserInfo Browser information object
   * @param domain The domain where the widget is loaded
   * @returns A unique SHA-256 hash as fingerprint
   */
  static generateFingerprint(browserInfo: BrowserInfo, domain: string): string {
    // Create a consistent string from browser info and domain
    const fingerprintData = {
      domain: domain.toLowerCase().trim(),
      userAgent: browserInfo.userAgent || '',
      language: browserInfo.language || '',
      platform: browserInfo.platform || '',
      screenResolution: browserInfo.screenResolution || '',
      timezone: browserInfo.timezone || '',
      cookieEnabled: browserInfo.cookieEnabled || false,
      doNotTrack: browserInfo.doNotTrack || '',
      plugins: Array.isArray(browserInfo.plugins)
        ? browserInfo.plugins.sort().join(',')
        : '',
      canvas: browserInfo.canvas || '',
      webgl: browserInfo.webgl || '',
    };

    // Create a deterministic string from the fingerprint data
    const fingerprintString = Object.keys(fingerprintData)
      .sort() // Ensure consistent ordering
      .map((key) => `${key}:${fingerprintData[key]}`)
      .join('|');

    // Generate SHA-256 hash
    return createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Generate a fallback fingerprint when browser info is minimal
   * @param domain The domain where the widget is loaded
   * @param userAgent User agent string (fallback)
   * @returns A basic fingerprint hash
   */
  static generateFallbackFingerprint(
    domain: string,
    userAgent?: string,
  ): string {
    const fallbackData = {
      domain: domain.toLowerCase().trim(),
      userAgent: userAgent || 'unknown',
      timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 24)), // Daily granularity for some uniqueness
    };

    const fingerprintString = Object.keys(fallbackData)
      .sort()
      .map((key) => `${key}:${fallbackData[key]}`)
      .join('|');

    return createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Validate if a fingerprint looks like a valid hash
   * @param fingerprint The fingerprint to validate
   * @returns True if it looks like a valid SHA-256 hash
   */
  static isValidFingerprint(fingerprint: string): boolean {
    return /^[a-f0-9]{64}$/i.test(fingerprint);
  }
}
