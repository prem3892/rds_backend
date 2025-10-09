export const resetPasswordTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Convoia Chat</title>
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
                                                                <!-- Logo with table-based layout and inline SVG -->
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
                                                                            <!-- Security badge -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 25px;">
                                                                                <tr>
                                                                                    <td style="padding: 8px 20px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: middle;">
                                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 8px;">
                                                                                                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                                                                                    </svg>
                                                                                                </td>
                                                                                                <td style="color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; vertical-align: middle;">
                                                                                                    SECURE REQUEST
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
                                                                            <h1 style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; line-height: 1.2;">Password Reset Request</h1>
                                                                            <p style="font-size: 16px; color: #6b7280; margin: 0 0 30px 0;">Let's get you back into your account</p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 18px; font-weight: 600; color: #1f2937; padding-bottom: 30px;">
                                                                            Hello {{firstName}} {{lastName}},
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding-bottom: 30px;">
                                                                            We received a request to reset the password for your <strong>Convoia Chat</strong> account. If you made this request, click the button below to create a new password.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- CTA Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 40px 0;">
                                                                    <tr>
                                                                        <td style="padding: 30px; text-align: center;">
                                                                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px;">Click the button below to reset your password:</p>
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
                                                                                                                <a href="{{resetLink}}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                                        <tr>
                                                                                                                            <td style="vertical-align: middle;">
                                                                                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 10px;">
                                                                                                                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                                                                                                                                </svg>
                                                                                                                            </td>
                                                                                                                            <td style="vertical-align: middle; color: #ffffff;">
                                                                                                                                Reset Password
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
                                                                                        <strong>Important:</strong> This password reset link will expire in {{expirationTime}}. If you don't reset your password within this time, you'll need to request a new reset link.
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding: 30px 0 20px 0;">
                                                                            <strong>Security Tips:</strong>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Security Tips -->
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
                                                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Use a Strong Password</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Choose a password with at least 8 characters, including uppercase, lowercase, numbers, and symbols</div>
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
                                                                                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Keep It Unique</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Don't reuse passwords from other accounts to maintain maximum security</div>
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
                                                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Didn't Request This?</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">If you didn't request a password reset, please ignore this email or contact support immediately</div>
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
                                                                                {{resetLink}}
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
                                                                            If you didn't request a password reset, please ignore this email. Your password will remain unchanged. For security reasons, if you continue to receive these emails without requesting them, please contact our support team immediately.
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
