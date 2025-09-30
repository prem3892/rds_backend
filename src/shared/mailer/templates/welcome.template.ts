export const welcomeTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Convoia Chat</title>
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
                                                                            <!-- Role badge -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 25px;">
                                                                                <tr>
                                                                                    <td style="padding: 8px 20px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: middle;">
                                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 8px;">
                                                                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                                                                    </svg>
                                                                                                </td>
                                                                                                <td style="color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; vertical-align: middle;">
                                                                                                    {{role}}
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
                                                                            <h1 style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; line-height: 1.2;">🎉 Welcome to Convoia Chat!</h1>
                                                                            <p style="font-size: 16px; color: #6b7280; margin: 0 0 30px 0;">Your account is ready - let's get started</p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 18px; font-weight: 600; color: #1f2937; padding-bottom: 30px;">
                                                                            Hello {{firstName}} {{lastName}},
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding-bottom: 30px;">
                                                                            Welcome to <strong>Convoia Chat</strong>! We're thrilled to have you join our platform. Your account has been successfully created and verified. You can now access all the features available to your role.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- CTA Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 40px 0;">
                                                                    <tr>
                                                                        <td style="padding: 30px; text-align: center;">
                                                                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px;">Ready to dive in? Access your dashboard now:</p>
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
                                                                                                                <a href="{{loginUrl}}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                                        <tr>
                                                                                                                            <td style="vertical-align: middle;">
                                                                                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 10px;">
                                                                                                                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                                                                                                                                </svg>
                                                                                                                            </td>
                                                                                                                            <td style="vertical-align: middle; color: #ffffff;">
                                                                                                                                Access Your Dashboard
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
                                                                
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding: 30px 0 20px 0;">
                                                                            <strong>🚀 What you can do now:</strong>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Feature Items - ADMIN -->
                                                                {{#if (eq role 'ADMIN')}}
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
                                                                                                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Manage Agents & Departments</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Organize your team, assign roles, and manage department structures</div>
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
                                                                                                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Configure Chat Widgets</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Customize and embed chat widgets on your websites</div>
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
                                                                                                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">View Comprehensive Analytics</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Track performance metrics, chat statistics, and team productivity</div>
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
                                                                                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Handle Customer Support</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Engage with customers and oversee all support interactions</div>
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
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Manage System Settings</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Configure platform settings, integrations, and preferences</div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                {{else if (eq role 'AGENT')}}
                                                                <!-- Feature Items - AGENT -->
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
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Handle Customer Chat Sessions</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Engage with customers in real-time through our intuitive chat interface</div>
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
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Manage Your Availability Status</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Control when you're available to receive new chat requests</div>
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
                                                                                                            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Use Canned Messages</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Save time with pre-written responses for common questions</div>
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
                                                                                                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Schedule Appointments</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Book and manage appointments with customers</div>
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
                                                                                                            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Access Customer History</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">View past conversations and customer interaction history</div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                {{else}}
                                                                <!-- Feature Items - CUSTOMER/USER -->
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
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Start Chat Conversations</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Connect with support agents instantly for help and assistance</div>
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
                                                                                                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Schedule Appointments</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Book appointments at your convenience</div>
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
                                                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Access Support Resources</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Browse help articles, FAQs, and documentation</div>
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
                                                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                                                                                        </svg>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td style="vertical-align: top;">
                                                                                                    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 14px;">Manage Your Profile</div>
                                                                                                    <div style="color: #6b7280; font-size: 13px; line-height: 1.4;">Update your personal information and preferences</div>
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
                                                                
                                                                <!-- Support Section -->
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
                                                                                        Need help getting started?
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">If you have any questions or need assistance, don't hesitate to reach out to our support team at <a href="mailto:{{supportEmail}}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">{{supportEmail}}</a></p>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="color: #6b7280; font-size: 14px; font-style: italic; padding-top: 20px;">
                                                                            We're here to help you make the most of our platform. Welcome aboard!
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        
                                                        <!-- Footer -->
                                                        <tr>
                                                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; border-radius: 0 0 20px 20px;">
                                                                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">This is an automated message from <span style="color: #3b82f6; font-weight: 600;">Convoia Chat</span></p>
                                                                <p style="color: #6b7280; font-size: 14px; margin: 0;">Need help? Contact us at {{supportEmail}}</p>
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
