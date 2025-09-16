export const agentVerificationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Agent Account - Convoia Chat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6;">
    <!-- Converted to table-based layout for Gmail compatibility -->
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
                                                            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; border-radius: 20px 20px 0 0;">
                                                                <!-- Replaced flexbox logo with table-based layout and inline SVG -->
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
                                                                            <!-- Converted agent badge to table with inline SVG -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 25px;">
                                                                                <tr>
                                                                                    <td style="padding: 8px 20px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: middle;">
                                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 8px;">
                                                                                                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.01 3.01 0 0 0 16.5 6.5c-.8 0-1.54.37-2.01.95l-.49.58c-.18.21-.43.38-.72.5L12 8.98V12h-2V7.27c0-.55.45-1 1-1s1 .45 1 1V8l1.5-.5c.28-.09.53-.26.71-.47l.49-.58A4.98 4.98 0 0 1 16.5 4.5c1.76 0 3.22.99 4.01 2.44L23 14h-3v6h-4z"/>
                                                                                                    </svg>
                                                                                                </td>
                                                                                                <td style="color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; vertical-align: middle;">
                                                                                                    AGENT ACCOUNT
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
                                                                            <h1 style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; line-height: 1.2;">Welcome to Your Agent Portal</h1>
                                                                            <p style="font-size: 16px; color: #6b7280; margin: 0 0 30px 0;">Let's verify your account to get started</p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 18px; font-weight: 600; color: #1f2937; padding-bottom: 30px;">
                                                                            Hello {{firstName}} {{lastName}},
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding-bottom: 30px;">
                                                                            Congratulations! Your agent account for <strong>Convoia Chat</strong> has been successfully created. You're just one step away from accessing your agent dashboard and starting to help customers.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- CTA Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 40px 0;">
                                                                    <tr>
                                                                        <td style="padding: 30px; text-align: center;">
                                                                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px;">Click the button below to verify your email and activate your agent access:</p>
                                                                            <!-- Button shadow simulation -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                                                                <tr>
                                                                                    <td>
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(59, 130, 246, 0.1); border-radius: 14px;">
                                                                                            <tr>
                                                                                                <td style="padding: 2px;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; border: 1px solid #2563eb;">
                                                                                                        <tr>
                                                                                                            <td>
                                                                                                                <a href="{{verificationLink}}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                                        <tr>
                                                                                                                            <td style="vertical-align: middle;">
                                                                                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 10px;">
                                                                                                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                                                                                                                </svg>
                                                                                                                            </td>
                                                                                                                            <td style="vertical-align: middle; color: #ffffff;">
                                                                                                                                Verify Agent Account
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    </table>
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
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Security Notice -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; margin: 30px 0;">
                                                                    <tr>
                                                                        <td style="padding: 20px;">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                <tr>
                                                                                    <td style="vertical-align: top; padding-right: 12px;">
                                                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b" style="display: block;">
                                                                                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                                                                        </svg>
                                                                                    </td>
                                                                                    <td style="color: #92400e; font-size: 14px; line-height: 1.5; vertical-align: top;">
                                                                                        <strong>Security Notice:</strong> This verification link will expire in {{expirationTime}}. For your security, please verify your account promptly. If the link expires, you can request a new verification email.
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding: 30px 0 20px 0;">
                                                                            <strong>Once verified, you'll have access to:</strong>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Feature Items -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td>
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                                                                                <tr>
                                                                                    <td style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; border: 1px solid #e2e8f0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 15px;">
                                                                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                                                                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Live Chat Interface</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Handle customer conversations in real-time with our intuitive chat interface</div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                                                                                <tr>
                                                                                    <td style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; border: 1px solid #e2e8f0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 15px;">
                                                                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Customer Management</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Access customer profiles, chat history, and conversation context</div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 15px;">
                                                                                <tr>
                                                                                    <td style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; border: 1px solid #e2e8f0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 15px;">
                                                                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                                                                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Performance Tracking</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Monitor your response times, customer satisfaction, and chat metrics</div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                                                                                <tr>
                                                                                    <td style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; border: 1px solid #e2e8f0;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: top; padding-right: 15px;">
                                                                                                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                                                                                            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Agent Tools & Settings</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Customize your profile, availability status, and notification preferences</div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Alternative Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 30px 0;">
                                                                    <tr>
                                                                        <td style="padding: 20px;">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                <tr>
                                                                                    <td style="vertical-align: middle;">
                                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#374151" style="display: block; margin-right: 8px;">
                                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                                                                                        </svg>
                                                                                    </td>
                                                                                    <td style="font-weight: 600; color: #374151; font-size: 14px; vertical-align: middle;">
                                                                                        Having trouble with the button?
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 8px 0;">Copy and paste this link into your browser:</p>
                                                                            <div style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 12px; color: #3b82f6; word-break: break-all; position: relative;">
                                                                                {{verificationLink}}
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#6b7280" style="position: absolute; top: 12px; right: 12px; opacity: 0.5;">
                                                                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                                                                </svg>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="color: #6b7280; font-size: 14px; font-style: italic; padding-top: 20px;">
                                                                            If you didn't create this agent account, please ignore this email or contact our support team immediately for assistance.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        
                                                        <!-- Footer -->
                                                        <tr>
                                                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 20px 20px;">
                                                                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">This is an automated message from <span style="color: #3b82f6; font-weight: 600;">Convoia Chat</span></p>
                                                                <p style="color: #6b7280; font-size: 14px; margin: 0;">Need help? Contact our support team anytime.</p>
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
