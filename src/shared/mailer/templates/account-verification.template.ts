export const accountVerificationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Enhanced main container with Gmail-compatible table structure -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                    <!-- Enhanced header with gradient background and logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- Added chat bubble logo icon -->
                                        <div style="margin-bottom: 20px;">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block;">
                                                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white" fillOpacity="0.9"/>
                                                <circle cx="8" cy="9" r="1.5" fill="#10b981"/>
                                                <circle cx="12" cy="9" r="1.5" fill="#10b981"/>
                                                <circle cx="16" cy="9" r="1.5" fill="#10b981"/>
                                            </svg>
                                        </div>
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff !important; line-height: 1.2;">
                                            Convoia Chat
                                        </h1>
                                        <p style="margin: 8px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9) !important; font-weight: 500;">
                                            Verify Your Account
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Enhanced main content area -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <!-- Welcome message with user icon -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <div style="display: inline-flex; align-items: center; margin-bottom: 24px;">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                                                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#10b981"/>
                                                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="#10b981"/>
                                            </svg>
                                            <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">
                                                Hello {{firstName}} {{lastName}},
                                            </h2>
                                        </div>
                                        
                                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                            Thank you for creating an account with us! To complete your registration and start using our services, please verify your email address by clicking the button below:
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Enhanced verification button with icon -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; border: 2px solid #e5e7eb;">
                                                    <a href="{{verificationLink}}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none; border-radius: 6px;">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-right: 8px;">
                                                            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                                        </svg>
                                                        Verify Email Address
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Enhanced security notice with warning icon -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                                <tr>
                                    <td style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td>
                                                    <div style="display: flex; align-items: flex-start;">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px; flex-shrink: 0; margin-top: 2px;">
                                                            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                        <div>
                                                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
                                                                📧 Email Verification Required
                                                            </p>
                                                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                                                                This verification link will expire in {{expirationTime}}. Please verify your account as soon as possible to avoid any service interruptions.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Enhanced features section with icons -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #4b5563; font-weight: 500;">
                                            Once your email is verified, you'll have full access to:
                                        </p>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <div style="display: flex; align-items: center;">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                                                            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#10b981"/>
                                                            <circle cx="8" cy="9" r="1.5" fill="white"/>
                                                            <circle cx="12" cy="9" r="1.5" fill="white"/>
                                                            <circle cx="16" cy="9" r="1.5" fill="white"/>
                                                        </svg>
                                                        <span style="font-size: 16px; color: #374151; font-weight: 500;">Convoia Chat</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <div style="display: flex; align-items: center;">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                                                            <path d="M10.325 4.317C10.751 2.561 13.249 2.561 13.675 4.317C13.7389 4.5808 13.8642 4.82578 14.0407 5.032C14.2172 5.23822 14.4399 5.39985 14.6907 5.50375C14.9414 5.60764 15.2132 5.65085 15.4838 5.62987C15.7544 5.60889 16.0162 5.5243 16.248 5.383C17.791 4.443 19.558 6.209 18.618 7.753C18.4769 7.98466 18.3924 8.24634 18.3715 8.51677C18.3506 8.78721 18.3938 9.05877 18.4975 9.30938C18.6013 9.55999 18.7627 9.78258 18.9687 9.95905C19.1747 10.1355 19.4194 10.2609 19.683 10.325C21.439 10.751 21.439 13.249 19.683 13.675C19.4192 13.7389 19.1742 13.8642 18.968 14.0407C18.7618 14.2172 18.6001 14.4399 18.4963 14.6907C18.3924 14.9414 18.3491 15.2132 18.3701 15.4838C18.3911 15.7544 18.4757 16.0162 18.617 16.248C19.557 17.791 17.791 19.558 16.247 18.618C16.0153 18.4769 15.7537 18.3924 15.4832 18.3715C15.2128 18.3506 14.9412 18.3938 14.6906 18.4975C14.44 18.6013 14.2174 18.7627 14.0409 18.9687C13.8645 19.1747 13.7391 19.4194 13.675 19.683C13.249 21.439 10.751 21.439 10.325 19.683C10.2611 19.4192 10.1358 19.1742 9.95929 18.968C9.7828 18.7618 9.56011 18.6001 9.30935 18.4963C9.05859 18.3924 8.78683 18.3491 8.51621 18.3701C8.24559 18.3911 7.98375 18.4757 7.752 18.617C6.209 19.557 4.442 17.791 5.382 16.247C5.5231 16.0153 5.60755 15.7537 5.62848 15.4832C5.64942 15.2128 5.60624 14.9412 5.50247 14.6906C5.3987 14.44 5.23726 14.2174 5.03127 14.0409C4.82529 13.8645 4.58056 13.7391 4.317 13.675C2.561 13.249 2.561 10.751 4.317 10.325C4.5808 10.2611 4.82578 10.1358 5.032 9.95929C5.23822 9.7828 5.39985 9.56011 5.50375 9.30935C5.60764 9.05859 5.65085 8.78683 5.62987 8.51621C5.60889 8.24559 5.5243 7.98375 5.383 7.752C4.443 6.209 6.209 4.442 7.753 5.382C8.753 5.99 10.049 5.452 10.325 4.317Z" fill="#10b981"/>
                                                            <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                        <span style="font-size: 16px; color: #374151; font-weight: 500;">Account management features</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <div style="display: flex; align-items: center;">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                                                            <path d="M3 13H11L13 9H21L19 13H11L9 17H1L3 13Z" fill="#10b981"/>
                                                            <path d="M13 13H21L19 17H11L13 13Z" fill="#059669"/>
                                                        </svg>
                                                        <span style="font-size: 16px; color: #374151; font-weight: 500;">Personalized dashboard</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <div style="display: flex; align-items: center;">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                                                            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="#10b981"/>
                                                        </svg>
                                                        <span style="font-size: 16px; color: #374151; font-weight: 500;">All platform services</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                                If you didn't create this account, please ignore this email or contact our support team if you have concerns.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Enhanced footer with help icon -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px; border-top: 2px solid #e5e7eb;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; margin-bottom: 16px;">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                                                <path d="M8.228 9C8.43686 8.47471 8.81005 8.03121 9.28844 7.73206C9.76683 7.4329 10.3265 7.29239 10.8854 7.33477C11.4443 7.37715 11.9743 7.60035 12.3983 7.96784C12.8224 8.33533 13.1191 8.82735 13.244 9.37295C13.3689 9.91855 13.3165 10.4912 13.0931 11.0016C12.8698 11.512 12.4884 11.9301 12.0007 12.1931C11.513 12.4561 10.9458 12.5499 10.3934 12.4598C9.84102 12.3698 9.33282 12.1004 8.95 11.69" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
                                                <path d="M12 17H12.01" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="2"/>
                                            </svg>
                                            <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">
                                                Need help? Here's the direct link:
                                            </p>
                                        </div>
                                        <p style="margin: 0 0 20px 0; font-size: 13px; color: #6b7280; word-break: break-all; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 2px solid #e5e7eb;">
                                            {{verificationLink}}
                                        </p>
                                        <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                                            This is an automated email. Please do not reply to this message.
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
</body>
</html>
`;
