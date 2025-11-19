import { Injectable } from '@nestjs/common';

export enum TrafficSource {
  GOOGLE_ADS = 'gad',
  META_ADS = 'meta',
  CHATGPT = 'chatgpt',
  ORGANIC = 'organic',
}

export interface AttributionData {
  source: TrafficSource;
  domain: string;
  campaignName?: string;
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

@Injectable()
export class AttributionService {
  parseUrl(url: string): AttributionData {
    if (!url) {
      return {
        source: TrafficSource.ORGANIC,
        domain: '',
      };
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname || '';
      const params = urlObj.searchParams;

      const utmSource = params.get('utm_source')?.toLowerCase() || '';
      const utmMedium = params.get('utm_medium')?.toLowerCase() || '';
      const utmCampaign = params.get('utm_campaign') || '';
      const utmId = params.get('utm_id') || '';

      const gclid = params.get('gclid');
      const gadCampaignId = params.get('gad_campaignid');
      const gadSource = params.get('gad_source');
      const fbclid = params.get('fbclid');

      let source: TrafficSource = TrafficSource.ORGANIC;

      if (gclid || gadCampaignId || gadSource || utmSource === 'adwords') {
        source = TrafficSource.GOOGLE_ADS;
      } else if (
        fbclid ||
        utmSource === 'meta' ||
        utmSource === 'fb_ad' ||
        utmMedium === 'fb'
      ) {
        source = TrafficSource.META_ADS;
      } else if (utmSource === 'chatgpt.com' || url.includes('chatgpt.com')) {
        source = TrafficSource.CHATGPT;
      }

      const campaignName = utmCampaign || utmId || undefined;

      return {
        source,
        domain,
        campaignName,
        campaignId: gadCampaignId || utmId || undefined,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
      };
    } catch (error) {
      return {
        source: TrafficSource.ORGANIC,
        domain: '',
      };
    }
  }

  isConversion(hasAppointment: boolean): boolean {
    return hasAppointment;
  }
}
