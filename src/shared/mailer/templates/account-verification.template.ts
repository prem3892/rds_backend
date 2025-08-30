export const accountVerificationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
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
            background-color: #10b981;
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
            background-color: #10b981;
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
        .info {
            background-color: #dbeafe;
            border: 1px solid #3b82f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome! Verify Your Account</h1>
    </div>
    <div class="content">
        <h2>Hello {{firstName}} {{lastName}},</h2>
        
        <p>Thank you for creating an account with us! To complete your registration and start using our services, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
            <a href="{{verificationLink}}" class="button">Verify Email Address</a>
        </div>
        
        <div class="info">
            <strong>📧 Email Verification Required:</strong> This verification link will expire in {{expirationTime}}. Please verify your account as soon as possible to avoid any service interruptions.
        </div>
        
        <p>Once your email is verified, you'll have full access to:</p>
        <ul>
            <li>Live chat support</li>
            <li>Account management features</li>
            <li>Personalized dashboard</li>
            <li>All platform services</li>
        </ul>
        
        <p>If you didn't create this account, please ignore this email or contact our support team if you have concerns.</p>
        
        <div class="footer">
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">{{verificationLink}}</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
`;
