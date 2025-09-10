import { FingerprintUtil, BrowserInfo } from './fingerprint.util';

describe('FingerprintUtil', () => {
  const mockBrowserInfo: BrowserInfo = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    language: 'en-US',
    platform: 'Win32',
    screenResolution: '1920x1080',
    timezone: 'America/New_York',
    cookieEnabled: true,
    doNotTrack: '0',
    plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer'],
    canvas: 'canvas_hash_123',
    webgl: 'webgl_hash_456',
  };

  describe('generateFingerprint', () => {
    it('should generate a consistent fingerprint for the same input', () => {
      const domain = 'example.com';
      const fingerprint1 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        domain,
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        domain,
      );

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different fingerprints for different domains', () => {
      const fingerprint1 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'different.com',
      );

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should generate different fingerprints for different browser info', () => {
      const browserInfo2 = {
        ...mockBrowserInfo,
        userAgent: 'Different User Agent',
      };
      const domain = 'example.com';

      const fingerprint1 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        domain,
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        browserInfo2,
        domain,
      );

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should handle missing browser info properties gracefully', () => {
      const minimalBrowserInfo: BrowserInfo = {
        userAgent: 'Mozilla/5.0',
      };

      const fingerprint = FingerprintUtil.generateFingerprint(
        minimalBrowserInfo,
        'example.com',
      );

      expect(fingerprint).toHaveLength(64);
      expect(FingerprintUtil.isValidFingerprint(fingerprint)).toBe(true);
    });

    it('should normalize domain case', () => {
      const fingerprint1 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'EXAMPLE.COM',
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
      );

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should sort plugins array for consistency', () => {
      const browserInfo1 = {
        ...mockBrowserInfo,
        plugins: ['Plugin A', 'Plugin B'],
      };
      const browserInfo2 = {
        ...mockBrowserInfo,
        plugins: ['Plugin B', 'Plugin A'],
      };

      const fingerprint1 = FingerprintUtil.generateFingerprint(
        browserInfo1,
        'example.com',
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        browserInfo2,
        'example.com',
      );

      expect(fingerprint1).toBe(fingerprint2);
    });
  });

  describe('generateFallbackFingerprint', () => {
    it('should generate a fallback fingerprint', () => {
      const fingerprint = FingerprintUtil.generateFallbackFingerprint(
        'example.com',
        'Mozilla/5.0',
      );

      expect(fingerprint).toHaveLength(64);
      expect(FingerprintUtil.isValidFingerprint(fingerprint)).toBe(true);
    });

    it('should generate different fingerprints for different domains', () => {
      const fingerprint1 =
        FingerprintUtil.generateFallbackFingerprint('example.com');
      const fingerprint2 =
        FingerprintUtil.generateFallbackFingerprint('different.com');

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('isValidFingerprint', () => {
    it('should validate correct SHA-256 hashes', () => {
      const validHash = 'a'.repeat(64);
      expect(FingerprintUtil.isValidFingerprint(validHash)).toBe(true);
    });

    it('should reject invalid hashes', () => {
      expect(FingerprintUtil.isValidFingerprint('invalid')).toBe(false);
      expect(FingerprintUtil.isValidFingerprint('a'.repeat(63))).toBe(false);
      expect(FingerprintUtil.isValidFingerprint('a'.repeat(65))).toBe(false);
      expect(FingerprintUtil.isValidFingerprint('')).toBe(false);
    });
  });
});
