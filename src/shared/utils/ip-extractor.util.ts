import { Socket } from 'socket.io';

export interface IpInfo {
  clientIp: string;
  country?: string;
  city?: string;
  cfRay?: string;
  isCloudflare: boolean;
  proxyChain?: string[];
}

export class IpExtractorUtil {
  /**
   * Extract IP and country information from socket headers
   * Prioritizes Cloudflare headers when available
   */
  static extractIpInfo(socket: Socket): IpInfo {
    const headers = socket.handshake.headers;

    // Check if request is coming through Cloudflare
    const cfConnectingIp = headers['cf-connecting-ip'] as string;
    const cfCountry = headers['cf-ipcountry'] as string;
    const cfCity = headers['cf-ipcity'] as string;
    const cfRay = headers['cf-ray'] as string;

    if (cfConnectingIp) {
      // Request is coming through Cloudflare
      return {
        clientIp: cfConnectingIp,
        country: cfCountry !== 'XX' ? cfCountry : undefined, // XX means unknown country
        city: cfCity && cfCity !== 'XX' ? cfCity : undefined, // XX means unknown city
        cfRay,
        isCloudflare: true,
        proxyChain: this.extractProxyChain(headers),
      };
    }

    // Fallback to standard headers if not using Cloudflare
    const clientIp = this.extractStandardIp(socket);

    return {
      clientIp,
      isCloudflare: false,
      proxyChain: this.extractProxyChain(headers),
    };
  }

  /**
   * Extract IP from standard headers (fallback method)
   */
  private static extractStandardIp(socket: Socket): string {
    const headers = socket.handshake.headers;

    // Try various headers in order of preference
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'x-forwarded',
      'x-cluster-client-ip',
      'forwarded-for',
      'forwarded',
    ];

    for (const header of ipHeaders) {
      const value = headers[header] as string;
      if (value) {
        // X-Forwarded-For can contain multiple IPs, take the first one
        const ip = value.split(',')[0].trim();
        if (this.isValidIp(ip)) {
          return ip;
        }
      }
    }

    // Fallback to socket remote address
    return socket.handshake.address || 'unknown';
  }

  /**
   * Extract proxy chain information
   */
  private static extractProxyChain(headers: any): string[] {
    const xForwardedFor = headers['x-forwarded-for'] as string;
    if (xForwardedFor) {
      return xForwardedFor.split(',').map((ip) => ip.trim());
    }
    return [];
  }

  /**
   * Basic IP validation
   */
  private static isValidIp(ip: string): boolean {
    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // Basic IPv6 validation
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if IP is from a private network
   */
  static isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Anonymize IP for privacy compliance
   */
  static anonymizeIp(ip: string): string {
    if (ip.includes(':')) {
      // IPv6 - zero out last 64 bits
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::';
    } else {
      // IPv4 - zero out last octet
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.0';
    }
  }
}
