export const appointmentConfirmationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmation - Convoia Chat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6;">
    <!-- Table-based layout for Gmail compatibility -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 20px; background-color: #f3f4f6;">
                <!-- Outer shadow simulation table -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 40px auto;">
                    <tr>
                        <td>
                            <!-- Shadow layers for Gmail compatibility -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgba(0,0,0,0.02); border-radius: 22px;">
                                <tr>
                                    <td style="padding: 2px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgba(0,0,0,0.03); border-radius: 21px;">
                                            <tr>
                                                <td style="padding: 2px;">
                                                    <!-- Main Container -->
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb;">
                                                        <!-- Header -->
                                                        <tr>
                                                            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center; border-radius: 20px 20px 0 0;">
                                                                <!-- Logo -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td align="center">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                <tr>
                                                                                    <td style="vertical-align: middle;">
                                                                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 12px;">
                                                                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                                                                        </svg>
                                                                                    </td>
                                                                                    <td style="font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle;">
                                                                                        Convoia Chat
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="center" style="padding-top: 8px;">
                                                                            <!-- Success badge with checkmark icon -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 25px;">
                                                                                <tr>
                                                                                    <td style="padding: 8px 20px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: middle;">
                                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 8px;">
                                                                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                                                                    </svg>
                                                                                                </td>
                                                                                                <td style="color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; vertical-align: middle;">
                                                                                                    APPOINTMENT CONFIRMED
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        
                                                        <!-- Content -->
                                                        <tr>
                                                            <td style="padding: 50px 40px; background-color: #ffffff;">
                                                                <!-- Welcome Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td align="center" style="padding-bottom: 40px;">
                                                                            <h1 style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; line-height: 1.2;">Your Appointment is Confirmed!</h1>
                                                                            <p style="font-size: 16px; color: #6b7280; margin: 0;">We're looking forward to meeting with you</p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 18px; font-weight: 600; color: #1f2937; padding-bottom: 30px;">
                                                                            Hello {{customerName}},
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding-bottom: 30px;">
                                                                            Your appointment has been successfully scheduled! Please review the details below and save this email for your records.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Appointment Details Card -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 16px; margin: 30px 0;">
                                                                    <tr>
                                                                        <td style="padding: 30px;">
                                                                            <h3 style="font-size: 18px; font-weight: 700; color: #065f46; margin: 0 0 20px 0;">Appointment Details</h3>
                                                                            
                                                                            <!-- Detail Row: Date -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-bottom: 1px solid #d1fae5; padding: 12px 0;">
                                                                                <tr>
                                                                                    <td style="font-weight: 600; color: #065f46; font-size: 15px; padding: 8px 0;">Date:</td>
                                                                                    <td align="right" style="color: #047857; font-size: 15px; padding: 8px 0;">{{appointmentDate}}</td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <!-- Detail Row: Time -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-bottom: 1px solid #d1fae5; padding: 12px 0;">
                                                                                <tr>
                                                                                    <td style="font-weight: 600; color: #065f46; font-size: 15px; padding: 8px 0;">Time:</td>
                                                                                    <td align="right" style="color: #047857; font-size: 15px; padding: 8px 0;">{{appointmentTime}}</td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <!-- Detail Row: Agent -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-bottom: 1px solid #d1fae5; padding: 12px 0;">
                                                                                <tr>
                                                                                    <td style="font-weight: 600; color: #065f46; font-size: 15px; padding: 8px 0;">Agent:</td>
                                                                                    <td align="right" style="color: #047857; font-size: 15px; padding: 8px 0;">{{agentName}}</td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <!-- Detail Row: Department -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-bottom: 1px solid #d1fae5; padding: 12px 0;">
                                                                                <tr>
                                                                                    <td style="font-weight: 600; color: #065f46; font-size: 15px; padding: 8px 0;">Department:</td>
                                                                                    <td align="right" style="color: #047857; font-size: 15px; padding: 8px 0;">{{department}}</td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <!-- Detail Row: Notes (conditional) -->
                                                                            {{#if notes}}
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 12px 0;">
                                                                                <tr>
                                                                                    <td style="font-weight: 600; color: #065f46; font-size: 15px; padding: 8px 0;">Notes:</td>
                                                                                    <td align="right" style="color: #047857; font-size: 15px; padding: 8px 0;">{{notes}}</td>
                                                                                </tr>
                                                                            </table>
                                                                            {{/if}}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- What to Expect Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                                                                    <tr>
                                                                        <td>
                                                                            <h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0;">What to Expect</h3>
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                <tr>
                                                                                    <td style="padding: 8px 0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 10px; color: #059669; font-size: 18px;">•</td>
                                                                                                <td style="color: #4b5563; font-size: 15px; line-height: 1.6;">Please be available 5 minutes before your scheduled time</td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="padding: 8px 0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 10px; color: #059669; font-size: 18px;">•</td>
                                                                                                <td style="color: #4b5563; font-size: 15px; line-height: 1.6;">You'll receive a reminder 24 hours before your appointment</td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="padding: 8px 0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 10px; color: #059669; font-size: 18px;">•</td>
                                                                                                <td style="color: #4b5563; font-size: 15px; line-height: 1.6;">Have any relevant documents or questions ready</td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="padding: 8px 0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 10px; color: #059669; font-size: 18px;">•</td>
                                                                                                <td style="color: #4b5563; font-size: 15px; line-height: 1.6;">The session will be conducted via our secure chat platform</td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Action Buttons (conditional) -->
                                                                {{#if rescheduleLink}}
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 40px 0;">
                                                                    <tr>
                                                                        <td align="center">
                                                                            <!-- Reschedule Button -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block; margin: 0 8px 16px 8px;">
                                                                                <tr>
                                                                                    <td>
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(5, 150, 105, 0.1); border-radius: 14px;">
                                                                                            <tr>
                                                                                                <td style="padding: 2px;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px; border: 1px solid #10b981;">
                                                                                                        <tr>
                                                                                                            <td>
                                                                                                                <a href="{{rescheduleLink}}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
                                                                                                                    Reschedule Appointment
                                                                                                                </a>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <!-- Cancel Button (conditional) -->
                                                                            {{#if cancelLink}}
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block; margin: 0 8px 16px 8px;">
                                                                                <tr>
                                                                                    <td>
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(107, 114, 128, 0.1); border-radius: 14px;">
                                                                                            <tr>
                                                                                                <td style="padding: 2px;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #6b7280; border-radius: 12px; border: 1px solid #9ca3af;">
                                                                                                        <tr>
                                                                                                            <td>
                                                                                                                <a href="{{cancelLink}}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
                                                                                                                    Cancel Appointment
                                                                                                                </a>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            {{/if}}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                {{/if}}
                                                                
                                                                <!-- Additional Info -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                                                                    <tr>
                                                                        <td style="font-size: 15px; color: #4b5563; line-height: 1.7;">
                                                                            If you need to make any changes or have questions about your appointment, please don't hesitate to contact us.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        
                                                        <!-- Footer -->
                                                        <tr>
                                                            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 20px 20px;">
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="padding-bottom: 12px;">
                                                                            <p style="margin: 0; font-size: 14px; color: #1f2937; line-height: 1.6;">
                                                                                <strong>Important:</strong> Please save this email for your records.
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="padding-bottom: 12px;">
                                                                            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                                                                                This is an automated email from <strong>Convoia Chat</strong>. Please do not reply to this message.
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="center" style="padding-top: 20px;">
                                                                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                                                                © 2024 Convoia Chat. All rights reserved.
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
