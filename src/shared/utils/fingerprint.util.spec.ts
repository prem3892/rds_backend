import { FingerprintUtil, BrowserInfo } from './fingerprint.util';
import { IpInfo } from './ip-extractor.util';

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

    it('should generate different fingerprints when IP info is included', () => {
      const mockIpInfo: IpInfo = {
        clientIp: '192.168.1.1',
        country: 'US',
        city: 'New York',
        isCloudflare: true,
        cfRay: 'test-ray-123',
        proxyChain: [],
      };

      const fingerprintWithoutIp = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
      );
      const fingerprintWithIp = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
        mockIpInfo,
      );

      expect(fingerprintWithoutIp).not.toBe(fingerprintWithIp);
    });

    it('should generate consistent fingerprints with same IP info', () => {
      const mockIpInfo: IpInfo = {
        clientIp: '192.168.1.1',
        country: 'US',
        city: 'New York',
        isCloudflare: true,
        cfRay: 'test-ray-123',
        proxyChain: [],
      };

      const fingerprint1 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
        mockIpInfo,
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
        mockIpInfo,
      );

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should generate different fingerprints for different IP addresses', () => {
      const ipInfo1: IpInfo = {
        clientIp: '192.168.1.1',
        country: 'US',
        isCloudflare: false,
        proxyChain: [],
      };
      const ipInfo2: IpInfo = {
        clientIp: '192.168.1.2',
        country: 'US',
        isCloudflare: false,
        proxyChain: [],
      };

      const fingerprint1 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
        ipInfo1,
      );
      const fingerprint2 = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
        ipInfo2,
      );

      expect(fingerprint1).not.toBe(fingerprint2);
    });

    it('should handle partial IP info gracefully', () => {
      const partialIpInfo: IpInfo = {
        clientIp: '192.168.1.1',
        isCloudflare: false,
        proxyChain: [],
        // country and city are undefined
      };

      const fingerprint = FingerprintUtil.generateFingerprint(
        mockBrowserInfo,
        'example.com',
        partialIpInfo,
      );

      expect(fingerprint).toHaveLength(64);
      expect(FingerprintUtil.isValidFingerprint(fingerprint)).toBe(true);
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
