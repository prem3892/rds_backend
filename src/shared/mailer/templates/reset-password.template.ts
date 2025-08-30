export const resetPasswordTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
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
            background-color: #4f46e5;
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
            background-color: #4f46e5;
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
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset Request</h1>
    </div>
    <div class="content">
        <h2>Hello {{firstName}} {{lastName}},</h2>
        
        <p>We received a request to reset your password for your account. If you made this request, please click the button below to reset your password:</p>
        
        <div style="text-align: center;">
            <a href="{{resetLink}}" class="button">Reset Password</a>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> This link will expire in {{expirationTime}}. If you don't reset your password within this time, you'll need to request a new reset link.
        </div>
        
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        
        <p>For security reasons, if you continue to receive these emails without requesting them, please contact our support team immediately.</p>
        
        <div class="footer">
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">{{resetLink}}</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
`;
