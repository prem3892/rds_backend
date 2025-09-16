export interface ResetPasswordTemplateData {
  firstName: string;
  lastName: string;
  resetLink: string;
  expirationTime: string;
}

export interface AccountVerificationTemplateData {
  firstName: string;
  lastName: string;
  verificationLink: string;
  expirationTime: string;
}

export interface WelcomeTemplateData {
  firstName: string;
  lastName: string;
  role: string;
  loginUrl: string;
  supportEmail: string;
}

export interface AdminVerificationTemplateData {
  firstName: string;
  lastName: string;
  verificationLink: string;
  expirationTime: string;
}

export interface AppointmentConfirmationTemplateData {
  customerName: string;
  agentName: string;
  appointmentDate: string;
  appointmentTime: string;
  department: string;
  notes?: string;
  rescheduleLink?: string;
  cancelLink?: string;
}

export interface ChatNotificationTemplateData {
  agentName: string;
  customerName: string;
  chatStartTime: string;
  missedMessages: number;
  chatLink: string;
}

export interface SystemNotificationTemplateData {
  adminName: string;
  notificationType: string;
  message: string;
  actionRequired?: boolean;
  actionLink?: string;
}

export interface ChatTranscriptTemplateData {
  customerName: string;
  customerEmail?: string;
  sessionId: string;
  chatStartTime: string;
  chatEndTime: string;
  // Legacy fields for backward compatibility
  inactivityReason: string;
  inactivityType: 'agent' | 'customer';
  // New generic fields for all ending types
  endReason?: string;
  endType?:
    | 'inactivity'
    | 'manual_end'
    | 'system_timeout'
    | 'technical_issue'
    | 'other';
  endedBy?: 'agent' | 'customer' | 'system';
  agentHistory: Array<{
    agentName: string;
    joinedAt: string;
    leftAt?: string;
    duration: string;
  }>;
  transcript: Array<{
    timestamp: string;
    senderName: string;
    senderType: 'customer' | 'agent';
    message: string;
  }>;
  domain: string;
  department: string;
}
