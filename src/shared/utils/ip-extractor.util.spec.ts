import { IpExtractorUtil } from './ip-extractor.util';

describe('IpExtractorUtil', () => {
  describe('extractIpInfo', () => {
    it('should extract Cloudflare IP information when CF headers are present', () => {
      const mockSocket = {
        handshake: {
          headers: {
            'cf-connecting-ip': '203.0.113.1',
            'cf-ipcountry': 'US',
            'cf-ipcity': 'Los Angeles',
            'cf-ray': '123456789abcdef0-LAX',
            'x-forwarded-for': '203.0.113.1, 198.51.100.1',
          },
          address: '127.0.0.1',
        },
      } as any;

      const result = IpExtractorUtil.extractIpInfo(mockSocket);

      expect(result).toEqual({
        clientIp: '203.0.113.1',
        country: 'US',
        city: 'Los Angeles',
        cfRay: '123456789abcdef0-LAX',
        isCloudflare: true,
        proxyChain: ['203.0.113.1', '198.51.100.1'],
      });
    });

    it('should handle unknown country (XX) from Cloudflare', () => {
      const mockSocket = {
        handshake: {
          headers: {
            'cf-connecting-ip': '203.0.113.1',
            'cf-ipcountry': 'XX', // Unknown country
            'cf-ipcity': 'XX', // Unknown city
            'cf-ray': '123456789abcdef0-LAX',
          },
          address: '127.0.0.1',
        },
      } as any;

      const result = IpExtractorUtil.extractIpInfo(mockSocket);

      expect(result.country).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.isCloudflare).toBe(true);
    });

    it('should fallback to standard headers when Cloudflare headers are not present', () => {
      const mockSocket = {
        handshake: {
          headers: {
            'x-forwarded-for': '203.0.113.1, 198.51.100.1',
            'x-real-ip': '203.0.113.1',
          },
          address: '127.0.0.1',
        },
      } as any;

      const result = IpExtractorUtil.extractIpInfo(mockSocket);

      expect(result).toEqual({
        clientIp: '203.0.113.1',
        isCloudflare: false,
        proxyChain: ['203.0.113.1', '198.51.100.1'],
      });
    });

    it('should use socket address as fallback when no headers are present', () => {
      const mockSocket = {
        handshake: {
          headers: {},
          address: '127.0.0.1',
        },
      } as any;

      const result = IpExtractorUtil.extractIpInfo(mockSocket);

      expect(result.clientIp).toBe('127.0.0.1');
      expect(result.isCloudflare).toBe(false);
    });
  });

  describe('isPrivateIp', () => {
    it('should identify private IPv4 addresses', () => {
      expect(IpExtractorUtil.isPrivateIp('192.168.1.1')).toBe(true);
      expect(IpExtractorUtil.isPrivateIp('10.0.0.1')).toBe(true);
      expect(IpExtractorUtil.isPrivateIp('172.16.0.1')).toBe(true);
      expect(IpExtractorUtil.isPrivateIp('127.0.0.1')).toBe(true);
    });

    it('should identify public IPv4 addresses', () => {
      expect(IpExtractorUtil.isPrivateIp('8.8.8.8')).toBe(false);
      expect(IpExtractorUtil.isPrivateIp('203.0.113.1')).toBe(false);
    });

    it('should identify private IPv6 addresses', () => {
      expect(IpExtractorUtil.isPrivateIp('::1')).toBe(true);
      expect(IpExtractorUtil.isPrivateIp('fc00::1')).toBe(true);
      expect(IpExtractorUtil.isPrivateIp('fe80::1')).toBe(true);
    });
  });

  describe('anonymizeIp', () => {
    it('should anonymize IPv4 addresses', () => {
      expect(IpExtractorUtil.anonymizeIp('192.168.1.100')).toBe('192.168.1.0');
      expect(IpExtractorUtil.anonymizeIp('8.8.8.8')).toBe('8.8.8.0');
    });

    it('should anonymize IPv6 addresses', () => {
      expect(
        IpExtractorUtil.anonymizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348'),
      ).toBe('2001:db8:85a3:8d3::');
    });
  });
});
