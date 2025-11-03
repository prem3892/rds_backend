export const chatTranscriptTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Session Transcript - Convoia Chat</title>
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
                            <!-- Shadow layers -->
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
                                                                            <!-- Inactivity Type Badge -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 25px;">
                                                                                <tr>
                                                                                    <td style="padding: 8px 20px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                            <tr>
                                                                                                <td style="vertical-align: middle;">
                                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="display: block; margin-right: 8px;">
                                                                                                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                                                                                    </svg>
                                                                                                </td>
                                                                                                <td style="color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; vertical-align: middle;">
                                                                                                    {{#if (eq inactivityType 'agent')}}AGENT INACTIVITY{{else}}CUSTOMER INACTIVITY{{/if}}
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
                                                                <!-- Title Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td align="center" style="padding-bottom: 30px;">
                                                                            <h1 style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; line-height: 1.2;">Chat Session Ended</h1>
                                                                            <p style="font-size: 16px; color: #6b7280; margin: 0;">Session Transcript & Summary</p>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Warning Box -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; margin-bottom: 30px;">
                                                                    <tr>
                                                                        <td style="padding: 20px;">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                <tr>
                                                                                    <td style="vertical-align: top; padding-right: 12px;">
                                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#d97706" style="display: block;">
                                                                                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                                                                                        </svg>
                                                                                    </td>
                                                                                    <td style="font-size: 15px; color: #92400e; line-height: 1.6;">
                                                                                        <strong style="display: block; margin-bottom: 4px;">Notice:</strong>
                                                                                        {{#if (eq inactivityType 'agent')}}
                                                                                        This chat session was automatically ended due to agent inactivity. We apologize for any inconvenience caused.
                                                                                        {{else}}
                                                                                        This chat session was automatically ended due to customer inactivity. The customer did not respond for an extended period.
                                                                                        {{/if}}
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>

                                                                <!-- Description -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="font-size: 16px; color: #4b5563; line-height: 1.7; padding-bottom: 30px;">
                                                                            A chat session was automatically ended due to {{#if (eq inactivityType 'agent')}}agent{{else}}customer{{/if}} inactivity. Below is the complete transcript and session details for your review.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Session Information Card -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin-bottom: 30px;">
                                                                    <tr>
                                                                        <td style="padding: 25px;">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                <tr>
                                                                                    <td style="padding-bottom: 15px;">
                                                                                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #991b1b;">Session Information</h3>
                                                                                    </td>
                                                                                </tr>
                                                                                <!-- Session Details -->
                                                                                <tr>
                                                                                    <td>
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Session ID:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{sessionId}}</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Customer:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{customerName}}{{#if customerEmail}} ({{customerEmail}}){{/if}}</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Department:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{department}}</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Domain:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{domain}}</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Started:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{chatStartTime}}</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Ended:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{chatEndTime}}</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 10px 0;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="font-weight: 600; color: #7f1d1d; font-size: 14px; width: 140px;">Reason:</td>
                                                                                                            <td style="color: #991b1b; font-size: 14px;">{{inactivityReason}}</td>
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

                                                                <!-- Agent History (Conditional) -->
                                                                {{#if agentHistory}}
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; margin-bottom: 30px;">
                                                                    <tr>
                                                                        <td style="padding: 25px;">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                <tr>
                                                                                    <td style="padding-bottom: 15px;">
                                                                                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e3a8a;">Agent History</h3>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="font-size: 14px; color: #1e40af; padding-bottom: 15px;">
                                                                                        The following agents were involved in this chat session:
                                                                                    </td>
                                                                                </tr>
                                                                                <!-- Agent Items -->
                                                                                {{#each agentHistory}}
                                                                                <tr>
                                                                                    <td style="padding-bottom: 15px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-left: 4px solid #3b82f6; border-radius: 8px;">
                                                                                            <tr>
                                                                                                <td style="padding: 15px;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="padding: 6px 0;">
                                                                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                                    <tr>
                                                                                                                        <td style="font-weight: 600; color: #1e3a8a; font-size: 13px; width: 100px;">Agent:</td>
                                                                                                                        <td style="color: #1e40af; font-size: 13px;">{{agentName}}</td>
                                                                                                                    </tr>
                                                                                                                </table>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td style="padding: 6px 0;">
                                                                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                                    <tr>
                                                                                                                        <td style="font-weight: 600; color: #1e3a8a; font-size: 13px; width: 100px;">Joined:</td>
                                                                                                                        <td style="color: #1e40af; font-size: 13px;">{{joinedAt}}</td>
                                                                                                                    </tr>
                                                                                                                </table>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        {{#if leftAt}}
                                                                                                        <tr>
                                                                                                            <td style="padding: 6px 0;">
                                                                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                                    <tr>
                                                                                                                        <td style="font-weight: 600; color: #1e3a8a; font-size: 13px; width: 100px;">Left:</td>
                                                                                                                        <td style="color: #1e40af; font-size: 13px;">{{leftAt}}</td>
                                                                                                                    </tr>
                                                                                                                </table>
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        {{/if}}
                                                                                                        <tr>
                                                                                                            <td style="padding: 6px 0;">
                                                                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                                    <tr>
                                                                                                                        <td style="font-weight: 600; color: #1e3a8a; font-size: 13px; width: 100px;">Duration:</td>
                                                                                                                        <td style="color: #1e40af; font-size: 13px;">{{duration}}</td>
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
                                                                                {{/each}}
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                {{/if}}

                                                                <!-- Chat Transcript -->
                                                                {{#if transcript}}
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 30px;">
                                                                    <tr>
                                                                        <td>
                                                                            <!-- Transcript Header -->
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-bottom: 1px solid #e5e7eb;">
                                                                                <tr>
                                                                                    <td style="padding: 20px;">
                                                                                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">Chat Transcript</h3>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            <!-- Messages -->
                                                                            {{#each transcript}}
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="{{#if (eq senderType 'customer')}}background-color: #f3f4f6;{{else}}background-color: #ecfdf5;{{/if}} border-bottom: 1px solid #e5e7eb;">
                                                                                <tr>
                                                                                    <td style="padding: 15px 20px;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                            <tr>
                                                                                                <td>
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                                        <tr>
                                                                                                            <td style="padding-bottom: 6px;">
                                                                                                                <span style="font-weight: 700; {{#if (eq senderType 'customer')}}color: #7c3aed;{{else}}color: #059669;{{/if}} font-size: 14px;">
                                                                                                                    {{senderName}}
                                                                                                                </span>
                                                                                                            </td>
                                                                                                            <td align="right" style="font-size: 12px; color: #6b7280; padding-bottom: 6px;">
                                                                                                                {{timestamp}}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                        <tr>
                                                                                                            <td colspan="2" style="font-size: 14px; color: #374151; line-height: 1.6; word-wrap: break-word;">
                                                                                                                {{message}}
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                            {{/each}}
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                {{else}}
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 30px;">
                                                                    <tr>
                                                                        <td style="padding: 40px; text-align: center; color: #6b7280; font-size: 15px;">
                                                                            No messages were exchanged in this session
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                {{/if}}

                                                                <!-- Action Required Section -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px;">
                                                                    <tr>
                                                                        <td style="padding: 25px;">
                                                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                <tr>
                                                                                    <td style="padding-bottom: 15px;">
                                                                                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e3a8a;">Action Required</h3>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td style="font-size: 14px; color: #475569; line-height: 1.8;">
                                                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                                            <tr>
                                                                                                <td style="padding: 6px 0;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                        <tr>
                                                                                                            <td style="vertical-align: top; padding-right: 10px; color: #3b82f6; font-size: 18px;">•</td>
                                                                                                            <td style="vertical-align: top;">Review the agent activity and determine if additional training is needed</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 6px 0;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                        <tr>
                                                                                                            <td style="vertical-align: top; padding-right: 10px; color: #3b82f6; font-size: 18px;">•</td>
                                                                                                            <td style="vertical-align: top;">Consider reaching out to the customer to apologize for the interruption</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 6px 0;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                        <tr>
                                                                                                            <td style="vertical-align: top; padding-right: 10px; color: #3b82f6; font-size: 18px;">•</td>
                                                                                                            <td style="vertical-align: top;">Check if the customer needs further assistance with their inquiry</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 6px 0;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                        <tr>
                                                                                                            <td style="vertical-align: top; padding-right: 10px; color: #3b82f6; font-size: 18px;">•</td>
                                                                                                            <td style="vertical-align: top;">Review agent workload and availability to prevent future occurrences</td>
                                                                                                        </tr>
                                                                                                    </table>
                                                                                                </td>
                                                                                            </tr>
                                                                                            <tr>
                                                                                                <td style="padding: 6px 0;">
                                                                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                                                                        <tr>
                                                                                                            <td style="vertical-align: top; padding-right: 10px; color: #3b82f6; font-size: 18px;">•</td>
                                                                                                            <td style="vertical-align: top;">This transcript has been saved for quality assurance and training purposes</td>
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

                                                                <!-- Closing Message -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tr>
                                                                        <td style="font-size: 15px; color: #4b5563; line-height: 1.7; padding-bottom: 30px;">
                                                                            Please take appropriate action to ensure customer satisfaction and prevent similar incidents in the future.
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                                
                                                                <!-- Footer -->
                                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #e5e7eb; padding-top: 30px;">
                                                                    <tr>
                                                                        <td align="center" style="padding-bottom: 15px;">
                                                                            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                                                                <strong>This is an automated email generated due to {{#if (eq inactivityType 'agent')}}agent{{else}}customer{{/if}} inactivity.</strong>
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="center" style="padding-bottom: 10px;">
                                                                            <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
                                                                                Please save this email for your records and take appropriate follow-up action.
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="center">
                                                                            <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
                                                                                Review your agent management and customer service processes to prevent future incidents.
                                                                            </p>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td align="center" style="padding-top: 20px;">
                                                                            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                                                                © Convoia Chat - Live Chat Support Platform
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
