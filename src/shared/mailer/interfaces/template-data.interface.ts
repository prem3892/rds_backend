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
