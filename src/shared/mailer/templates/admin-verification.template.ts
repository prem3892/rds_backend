export const adminVerificationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Admin Account</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .title {
            color: #2c3e50;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
        }
        .content {
            margin-bottom: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .message {
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .verify-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .verify-button:hover {
            transform: translateY(-2px);
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .alternative-link {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .alternative-link p {
            margin: 5px 0;
            font-size: 14px;
        }
        .link-text {
            word-break: break-all;
            color: #667eea;
            font-family: monospace;
            font-size: 12px;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .admin-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Live Chat System</div>
            <div class="admin-badge">ADMIN ACCOUNT</div>
        </div>
        
        <h1 class="title">Verify Your Admin Account</h1>
        
        <div class="content">
            <div class="greeting">Hello {{firstName}} {{lastName}},</div>
            
            <div class="message">
                <p>Welcome to the Live Chat System! Your admin account has been successfully created.</p>
                
                <p>To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
            </div>
            
            <div class="button-container">
                <a href="{{verificationLink}}" class="verify-button">Verify Admin Account</a>
            </div>
            
            <div class="alternative-link">
                <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
                <p class="link-text">{{verificationLink}}</p>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This verification link will expire in {{expirationTime}}. If you don't verify your account within this time, you'll need to request a new verification email.
            </div>
            
            <div class="message">
                <p>Once verified, you'll have full administrative access to:</p>
                <ul>
                    <li>Manage chat agents and departments</li>
                    <li>Monitor chat sessions and analytics</li>
                    <li>Configure system settings</li>
                    <li>Access administrative dashboard</li>
                </ul>
            </div>
            
            <div class="message">
                <p>If you didn't create this admin account, please ignore this email or contact our support team immediately.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Live Chat System.</p>
            <p>For support, please contact our team.</p>
        </div>
    </div>
</body>
</html>
`;
