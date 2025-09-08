# Mailer Service Implementation Guide

## 🎉 Implementation Complete!

The mailer service has been successfully implemented in your NestJS application. Here's everything you need to know to use it effectively.

## 📁 What Was Created

### Directory Structure

```
src/shared/mailer/
├── mailer.module.ts          # Global mailer module
├── mailer.service.ts         # Core mailer service
├── mailer.controller.ts      # Test endpoints (Admin only)
├── interfaces/
│   ├── mail-options.interface.ts     # Email interfaces
│   └── template-data.interface.ts    # Template data types
├── templates/
│   ├── reset-password.template.ts    # Password reset email
│   ├── account-verification.template.ts  # Email verification
│   ├── welcome.template.ts           # Welcome email
│   └── appointment-confirmation.template.ts  # Appointment emails
└── dto/
    └── send-mail.dto.ts              # Email DTOs
```

### Updated Files

- `src/config/configuration.ts` - Added mail configuration
- `src/schemas/user.schema.ts` - Added email verification fields
- `src/auth/auth.service.ts` - Added email functionality
- `src/auth/auth.controller.ts` - Added email endpoints
- `src/users/users.service.ts` - Added helper methods
- `src/app.module.ts` - Imported MailerModule
- `.env.example` - Added mail environment variables

## ⚙️ Configuration

### 1. Environment Variables

Copy the mail configuration from `.env.example` to your environment file:

```bash
# Mail Configuration
MAIL_ENABLED=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@yourapp.com
```

### 2. Gmail Setup (Recommended)

For Gmail, you'll need to:

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password as `MAIL_PASS`

### 3. Other Email Providers

**SendGrid:**

```bash
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASS=your-sendgrid-api-key
```

**Outlook/Hotmail:**

```bash
MAIL_HOST=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_USER=your-email@outlook.com
MAIL_PASS=your-password
```

## 🚀 Usage

### 1. Basic Email Sending

```typescript
import { MailerService } from '../shared/mailer/mailer.service';

@Injectable()
export class YourService {
  constructor(private readonly mailerService: MailerService) {}

  async sendBasicEmail() {
    const success = await this.mailerService.sendMail({
      to: 'user@example.com',
      subject: 'Hello World',
      html: '<h1>Hello from your app!</h1>',
    });

    return success;
  }
}
```

### 2. Template Emails

```typescript
// Send welcome email
await this.mailerService.sendWelcomeEmail('user@example.com', {
  firstName: 'John',
  lastName: 'Doe',
  role: 'AGENT',
  loginUrl: 'https://yourapp.com/login',
  supportEmail: 'support@yourapp.com',
});

// Send password reset email
await this.mailerService.sendResetPasswordEmail('user@example.com', {
  firstName: 'John',
  lastName: 'Doe',
  resetLink: 'https://yourapp.com/reset-password?token=abc123',
  expirationTime: '1 hour',
});

// Send appointment confirmation
await this.mailerService.sendAppointmentConfirmationEmail(
  'customer@example.com',
  {
    customerName: 'Jane Smith',
    agentName: 'John Doe',
    appointmentDate: '2024-01-15',
    appointmentTime: '2:00 PM',
    department: 'Support',
    notes: 'Please bring your account details',
  },
);
```

### 3. Custom Template Emails

```typescript
await this.mailerService.sendTemplateMail({
  to: 'user@example.com',
  subject: 'Custom Email',
  template: 'welcome', // Available: welcome, reset-password, account-verification, appointment-confirmation
  context: {
    firstName: 'John',
    lastName: 'Doe',
    // ... other template variables
  },
});
```

## 🔗 API Endpoints

### Authentication Endpoints

#### Password Reset

```bash
# Request password reset
POST /auth/forgot-password
{
  "email": "user@example.com"
}

# Reset password with token
POST /auth/reset-password
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

#### Email Verification

```bash
# Send verification email (requires authentication)
POST /auth/send-verification
Authorization: Bearer <jwt-token>

# Verify email with token
GET /auth/verify-email?token=verification-token-from-email
```

### Testing Endpoints (Admin Only)

```bash
# Test mail server connection
GET /mailer/test-connection
Authorization: Bearer <admin-jwt-token>

# Send test email
POST /mailer/send-test-email?to=test@example.com
Authorization: Bearer <admin-jwt-token>

# Send custom email
POST /mailer/send-mail
Authorization: Bearer <admin-jwt-token>
{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Test</h1>"
}

# Send welcome email
POST /mailer/send-welcome-email
Authorization: Bearer <admin-jwt-token>
{
  "to": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "AGENT"
}
```

## 🧪 Testing

### 1. Test Mail Server Connection

```bash
curl -X GET "http://localhost:5000/mailer/test-connection" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 2. Send Test Email

```bash
curl -X POST "http://localhost:5000/mailer/send-test-email?to=your-email@example.com" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 3. Test Password Reset Flow

```bash
# 1. Request password reset
curl -X POST "http://localhost:5000/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# 2. Check your email for reset link
# 3. Use token from email to reset password
curl -X POST "http://localhost:5000/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_EMAIL", "newPassword": "newPassword123"}'
```

## 🎨 Email Templates

### Available Templates

1. **Welcome Email** (`welcome`)

   - Used for new user registration
   - Variables: firstName, lastName, role, loginUrl, supportEmail

2. **Password Reset** (`reset-password`)

   - Used for password reset requests
   - Variables: firstName, lastName, resetLink, expirationTime

3. **Account Verification** (`account-verification`)

   - Used for email verification
   - Variables: firstName, lastName, verificationLink, expirationTime

4. **Appointment Confirmation** (`appointment-confirmation`)
   - Used for appointment confirmations
   - Variables: customerName, agentName, appointmentDate, appointmentTime, department, notes

### Customizing Templates

Templates are located in `src/shared/mailer/templates/`. Each template is a Handlebars template with HTML styling.

To modify a template:

1. Edit the template file (e.g., `welcome.template.ts`)
2. Rebuild the application: `npm run build`
3. Restart the server

## 🔧 Advanced Configuration

### Disable Email Service

Set `MAIL_ENABLED=false` in your environment to disable email sending (useful for testing).

### Custom SMTP Settings

```bash
# For custom SMTP servers
MAIL_HOST=your-smtp-server.com
MAIL_PORT=587
MAIL_SECURE=false  # true for port 465, false for other ports
MAIL_USER=your-username
MAIL_PASS=your-password
```

### Queue Integration (Future Enhancement)

The service is designed to easily integrate with Redis queues for better performance:

```typescript
// Future implementation example
await this.emailQueue.add('send-welcome-email', {
  to: user.email,
  templateData: welcomeData,
});
```

## 🐛 Troubleshooting

### Common Issues

1. **"Mail service is disabled"**

   - Check `MAIL_ENABLED=true` in your environment
   - Verify mail credentials are set

2. **"Authentication failed"**

   - For Gmail: Use App Password, not regular password
   - Verify username/password are correct

3. **"Connection timeout"**

   - Check firewall settings
   - Verify SMTP host and port

4. **Templates not working**
   - Ensure templates are compiled (restart server)
   - Check template variable names match interface

### Debug Mode

Enable detailed logging by setting log level to debug in your NestJS configuration.

## 📚 Integration Examples

### With Appointments Service

```typescript
@Injectable()
export class AppointmentsService {
  constructor(private readonly mailerService: MailerService) {}

  async confirmAppointment(appointmentId: string) {
    const appointment = await this.findById(appointmentId);

    await this.mailerService.sendAppointmentConfirmationEmail(
      appointment.customerEmail,
      {
        customerName: appointment.customerName,
        agentName: appointment.agent.name,
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        department: appointment.department.name,
        notes: appointment.notes,
      },
    );
  }
}
```

### With User Registration

The mailer is already integrated with the auth service. Welcome emails are automatically sent when:

- New users are registered via `/auth/register`
- New admins are registered via `/auth/admin/signup`

## 🔒 Security Considerations

1. **Email Credentials**: Store in environment variables, never in code
2. **Rate Limiting**: Consider implementing rate limiting for email endpoints
3. **Token Expiration**: Reset and verification tokens expire automatically
4. **Input Validation**: All email inputs are validated using class-validator

## 📈 Monitoring

Monitor email delivery success/failure through application logs. The service logs:

- Successful email sends with message IDs
- Failed email attempts with error details
- Template compilation status
- SMTP connection status

---

## 🎯 Next Steps

1. **Set up your email credentials** in environment variables
2. **Test the connection** using `/mailer/test-connection`
3. **Send a test email** using `/mailer/send-test-email`
4. **Test the auth flow** with password reset
5. **Customize email templates** as needed
6. **Monitor logs** for any issues

Your mailer service is now ready to use! 🚀
