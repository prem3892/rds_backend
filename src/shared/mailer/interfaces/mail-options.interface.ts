export interface MailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface TemplateMailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  enabled: boolean;
}
