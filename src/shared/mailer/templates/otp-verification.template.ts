export const otpVerificationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - OTP Code</title>
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
        .otp-container {
            background: #f8f9fa;
            border: 2px dashed #007bff;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #007bff;
            letter-spacing: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .otp-label {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        .expiry {
            color: #dc3545;
            font-weight: bold;
        }
        .security-note {
            background: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐 Live Chat System</div>
        </div>
        
        <h1 class="title">Email Verification Code</h1>
        
        <div class="content">
            <p>Hello <strong>{{firstName}} {{lastName}}</strong>,</p>
            
            <p>You requested to verify your email address. Please use the following One-Time Password (OTP) to complete your email verification:</p>
        </div>
        
        <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">{{otp}}</div>
            <div class="expiry">Expires in {{expirationTime}}</div>
        </div>
        
        <div class="content">
            <p>Enter this code in the verification form to activate your account and start using our live chat system.</p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> This code will expire in {{expirationTime}}. If you don't use it within this time, you'll need to request a new verification code.
        </div>
        
        <div class="security-note">
            <strong>🔒 Security Note:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Never share this code with anyone</li>
                <li>Our team will never ask for this code</li>
                <li>If you didn't request this verification, please ignore this email</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>If you're having trouble with email verification, please contact our support team.</p>
            <p><strong>Live Chat System Team</strong></p>
            <p style="font-size: 12px; color: #999;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
`;
