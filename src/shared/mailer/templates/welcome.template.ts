export const welcomeTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #8b5cf6;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            background-color: #8b5cf6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .feature-list {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .role-badge {
            display: inline-block;
            background-color: #1f2937;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to Our Platform!</h1>
    </div>
    <div class="content">
        <h2>Hello {{firstName}} {{lastName}},</h2>
        
        <p>Welcome to our live chat platform! We're excited to have you join us as a <span class="role-badge">{{role}}</span>.</p>
        
        <p>Your account has been successfully created and verified. You can now access all the features available to your role.</p>
        
        <div style="text-align: center;">
            <a href="{{loginUrl}}" class="button">Access Your Dashboard</a>
        </div>
        
        <div class="feature-list">
            <h3>🚀 What you can do now:</h3>
            {{#if (eq role 'ADMIN')}}
            <ul>
                <li>Manage agents and departments</li>
                <li>Configure chat widgets</li>
                <li>View comprehensive analytics</li>
                <li>Handle customer support</li>
                <li>Manage system settings</li>
            </ul>
            {{else if (eq role 'AGENT')}}
            <ul>
                <li>Handle customer chat sessions</li>
                <li>Manage your availability status</li>
                <li>Use canned messages</li>
                <li>Schedule appointments</li>
                <li>Access customer history</li>
            </ul>
            {{else}}
            <ul>
                <li>Start chat conversations</li>
                <li>Schedule appointments</li>
                <li>Access support resources</li>
                <li>Manage your profile</li>
            </ul>
            {{/if}}
        </div>
        
        <p>If you have any questions or need assistance getting started, don't hesitate to reach out to our support team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
        
        <p>We're here to help you make the most of our platform!</p>
        
        <div class="footer">
            <p><strong>Need help?</strong> Contact us at {{supportEmail}}</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
`;
