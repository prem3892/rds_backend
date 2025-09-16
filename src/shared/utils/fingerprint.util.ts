import { createHash } from 'crypto';
import { IpInfo } from './ip-extractor.util';

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
   * Generate a unique fingerprint based on browser information, domain, and IP info
   * @param browserInfo Browser information object
   * @param domain The domain where the widget is loaded
   * @param ipInfo Optional IP information for enhanced fingerprinting
   * @returns A unique SHA-256 hash as fingerprint
   */
  static generateFingerprint(
    browserInfo: BrowserInfo,
    domain: string,
    ipInfo?: IpInfo,
  ): string {
    // Create a consistent string from browser info, domain, and IP info
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
      // Include IP information if provided
      clientIp: ipInfo?.clientIp || '',
      country: ipInfo?.country || '',
      city: ipInfo?.city || '',
      isCloudflare: ipInfo?.isCloudflare || false,
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
