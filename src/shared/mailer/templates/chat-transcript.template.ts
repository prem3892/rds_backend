export const chatTranscriptTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Session Transcript</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .session-info {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .agent-history {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .transcript {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            margin: 20px 0;
            max-height: 500px;
            overflow-y: auto;
        }
        .message {
            padding: 12px 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        .message:last-child {
            border-bottom: none;
        }
        .message-customer {
            background-color: #f3f4f6;
        }
        .message-agent {
            background-color: #ecfdf5;
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }
        .sender-name {
            font-weight: bold;
            color: #374151;
        }
        .sender-customer {
            color: #7c3aed;
        }
        .sender-agent {
            color: #059669;
        }
        .timestamp {
            font-size: 12px;
            color: #6b7280;
        }
        .message-content {
            color: #374151;
            word-wrap: break-word;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: bold;
            color: #374151;
            min-width: 120px;
        }
        .agent-item {
            background-color: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 4px solid #3b82f6;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .warning-box {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .warning-icon {
            color: #d97706;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Chat Session Ended Due to {{#if (eq inactivityType 'agent')}}Agent{{else}}Customer{{/if}} Inactivity</h1>
            <p>Session Transcript & Summary</p>
        </div>
        
        <div class="content">
            <div class="warning-box">
                <span class="warning-icon">⚠️ Notice:</span> 
                {{#if (eq inactivityType 'agent')}}
                This chat session was automatically ended due to agent inactivity. We apologize for any inconvenience caused.
                {{else}}
                This chat session was automatically ended due to customer inactivity. The customer did not respond for an extended period.
                {{/if}}
            </div>

            <h2>Chat Session Alert</h2>
            
            <p>A chat session was automatically ended due to {{#if (eq inactivityType 'agent')}}agent{{else}}customer{{/if}} inactivity. Below is the complete transcript and session details for your review.</p>
            
            <div class="session-info">
                <h3>📋 Session Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Session ID:</span>
                    <span>{{sessionId}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Customer:</span>
                    <span>{{customerName}}{{#if customerEmail}} ({{customerEmail}}){{/if}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Department:</span>
                    <span>{{department}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Domain:</span>
                    <span>{{domain}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Started:</span>
                    <span>{{chatStartTime}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ended:</span>
                    <span>{{chatEndTime}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reason:</span>
                    <span>{{inactivityReason}}</span>
                </div>
            </div>

            {{#if agentHistory}}
            <div class="agent-history">
                <h3>👥 Agent History</h3>
                <p>The following agents were involved in this chat session:</p>
                {{#each agentHistory}}
                <div class="agent-item">
                    <div class="detail-row">
                        <span class="detail-label">Agent:</span>
                        <span>{{agentName}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Joined:</span>
                        <span>{{joinedAt}}</span>
                    </div>
                    {{#if leftAt}}
                    <div class="detail-row">
                        <span class="detail-label">Left:</span>
                        <span>{{leftAt}}</span>
                    </div>
                    {{/if}}
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span>{{duration}}</span>
                    </div>
                </div>
                {{/each}}
            </div>
            {{/if}}

            {{#if transcript}}
            <div class="transcript">
                <h3 style="padding: 20px 20px 10px 20px; margin: 0; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">💬 Chat Transcript</h3>
                {{#each transcript}}
                <div class="message {{#if (eq senderType 'customer')}}message-customer{{else}}message-agent{{/if}}">
                    <div class="message-header">
                        <span class="sender-name {{#if (eq senderType 'customer')}}sender-customer{{else}}sender-agent{{/if}}">
                            {{#if (eq senderType 'customer')}}👤{{else}}🎧{{/if}} {{senderName}}
                        </span>
                        <span class="timestamp">{{timestamp}}</span>
                    </div>
                    <div class="message-content">{{message}}</div>
                </div>
                {{/each}}
            </div>
            {{else}}
            <div class="transcript">
                <h3 style="padding: 20px; margin: 0; text-align: center; color: #6b7280;">No messages were exchanged in this session</h3>
            </div>
            {{/if}}

            <p><strong>Action Required:</strong></p>
            <ul>
                <li>Review the agent activity and determine if additional training is needed</li>
                <li>Consider reaching out to the customer to apologize for the interruption</li>
                <li>Check if the customer needs further assistance with their inquiry</li>
                <li>Review agent workload and availability to prevent future occurrences</li>
                <li>This transcript has been saved for quality assurance and training purposes</li>
            </ul>

            <p>Please take appropriate action to ensure customer satisfaction and prevent similar incidents in the future.</p>
            
            <div class="footer">
                <p><strong>This is an automated email generated due to {{#if (eq inactivityType 'agent')}}agent{{else}}customer{{/if}} inactivity.</strong></p>
                <p>Please save this email for your records and take appropriate follow-up action.</p>
                <p>Review your agent management and customer service processes to prevent future incidents.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;
