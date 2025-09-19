# OTP Email Verification System

## Overview

The Live Chat System now supports **OTP (One-Time Password) verification** as an alternative to the traditional token-based email verification. Users can choose between:

1. **Token-based verification** (existing system) - Click link in email
2. **OTP-based verification** (new system) - Enter 6-digit code from email

## Features

### Security Features

- **6-digit numeric OTP** generated using cryptographically secure random numbers
- **10-minute expiration** for OTP codes
- **Rate limiting**: Maximum 1 OTP request every 2 minutes
- **Attempt limiting**: Maximum 5 verification attempts per OTP
- **Automatic cleanup** of expired OTP data

### User Experience

- **Fast verification** - No need to click links or navigate to external pages
- **Mobile-friendly** - Easy to copy-paste 6-digit codes
- **Clear error messages** with remaining attempts counter
- **Backward compatibility** - Existing token-based system remains fully functional

## API Endpoints

### 1. Send OTP for Authenticated Users

**Endpoint:** `POST /auth/send-verification-otp`  
**Authentication:** Required (JWT Bearer token)

**Description:** Send OTP to the authenticated user's email address.

**Response:**

```json
{
  "message": "Verification OTP sent successfully. Please check your email."
}
```

**Error Responses:**

- `400` - Email already verified, user not found, or rate limit exceeded
- `401` - Authentication required

---

### 2. Verify Email with OTP

**Endpoint:** `POST /auth/verify-email-otp`  
**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "message": "Email verified successfully. You can now login."
}
```

**Error Responses:**

- `400` - Invalid OTP, expired OTP, or too many attempts
- `404` - User not found

---

### 3. Resend OTP (General)

**Endpoint:** `POST /auth/resend-verification-otp`  
**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "Verification OTP sent successfully. Please check your email."
}
```

**Error Responses:**

- `400` - Invalid email, user not found, email already verified, or rate limit exceeded
- `404` - User not found

---

### 4. Resend OTP (Admin Only)

**Endpoint:** `POST /auth/admin/resend-verification-otp`  
**Authentication:** Not required

**Request Body:**

```json
{
  "email": "admin@example.com"
}
```

**Response:**

```json
{
  "message": "Verification OTP sent successfully. Please check your email."
}
```

**Error Responses:**

- `400` - Invalid email, user not found, not an admin, email already verified, or rate limit exceeded
- `404` - User not found

## Database Schema Changes

### New User Schema Fields

```typescript
// OTP-related fields
emailVerificationOtp: string; // 6-digit OTP code
emailVerificationOtpExpires: Date; // OTP expiration time
emailVerificationMethod: string; // 'token' | 'otp'
otpAttempts: number; // Failed attempt counter
lastOtpRequestTime: Date; // Rate limiting timestamp
```

## Email Template

The OTP verification email includes:

- **Clear subject line**: "Email Verification Code - Live Chat System"
- **Prominent OTP display** with large, monospace font
- **Expiration time** clearly stated (10 minutes)
- **Security warnings** about not sharing the code
- **Professional styling** matching the existing email templates

## Rate Limiting & Security

### Rate Limiting Rules

- **OTP Generation**: Maximum 1 request every 2 minutes per user
- **Clear error messages** showing remaining wait time

### Attempt Limiting

- **Maximum 5 attempts** per OTP code
- **Automatic cleanup** after max attempts exceeded
- **Forces new OTP request** after failed attempts limit

### Security Measures

- **Cryptographically secure** OTP generation using `crypto.randomInt()`
- **Automatic expiration** after 10 minutes
- **Data cleanup** after successful verification
- **No OTP storage** in logs or error messages

## Usage Examples

### Frontend Integration Example

```javascript
// Send OTP to authenticated user
const sendOtp = async () => {
  try {
    const response = await fetch('/auth/send-verification-otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      alert('OTP sent to your email!');
    }
  } catch (error) {
    console.error('Failed to send OTP:', error);
  }
};

// Verify OTP
const verifyOtp = async (email, otp) => {
  try {
    const response = await fetch('/auth/verify-email-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    if (response.ok) {
      alert('Email verified successfully!');
      // Redirect to login or dashboard
    }
  } catch (error) {
    console.error('Failed to verify OTP:', error);
  }
};
```

### Mobile App Integration

```javascript
// React Native example
const handleOtpVerification = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        otp: otpCode,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // Success - navigate to main app
      navigation.navigate('Dashboard');
    } else {
      // Show error message
      Alert.alert('Verification Failed', result.message);
    }
  } catch (error) {
    Alert.alert('Error', 'Network error occurred');
  }
};
```

## Error Handling

### Common Error Scenarios

1. **Rate Limit Exceeded**

   ```json
   {
     "statusCode": 400,
     "message": "Please wait 1 minute(s) before requesting a new OTP",
     "error": "Bad Request"
   }
   ```

2. **Invalid OTP**

   ```json
   {
     "statusCode": 400,
     "message": "Invalid OTP. 3 attempt(s) remaining.",
     "error": "Bad Request"
   }
   ```

3. **Expired OTP**

   ```json
   {
     "statusCode": 400,
     "message": "OTP has expired. Please request a new verification code.",
     "error": "Bad Request"
   }
   ```

4. **Too Many Attempts**
   ```json
   {
     "statusCode": 400,
     "message": "Too many failed attempts. Please request a new verification code.",
     "error": "Bad Request"
   }
   ```

## Migration Guide

### For Existing Applications

1. **Database Migration**: The new fields are optional and have default values
2. **API Compatibility**: All existing token-based endpoints remain unchanged
3. **Gradual Rollout**: You can introduce OTP verification alongside existing system
4. **User Choice**: Allow users to choose their preferred verification method

### Recommended Implementation Steps

1. **Deploy the updated system** with both verification methods
2. **Update frontend** to offer OTP as an option
3. **Monitor usage** and user feedback
4. **Gradually promote** OTP verification for better UX
5. **Consider deprecating** token-based system in future versions (optional)

## Configuration

### Environment Variables

No additional environment variables are required. The system uses existing email configuration.

### Customization Options

You can customize the following in the code:

- **OTP length**: Currently 6 digits (in `generateOtp()` method)
- **Expiration time**: Currently 10 minutes (in service methods)
- **Rate limit**: Currently 2 minutes (in service methods)
- **Max attempts**: Currently 5 attempts (in `verifyEmailOtp()` method)

## Testing

### Manual Testing Checklist

- [ ] Send OTP to authenticated user
- [ ] Verify valid OTP code
- [ ] Test invalid OTP code
- [ ] Test expired OTP code
- [ ] Test rate limiting (multiple requests)
- [ ] Test attempt limiting (multiple wrong codes)
- [ ] Test email template rendering
- [ ] Test admin-specific OTP endpoints

### API Testing Examples

```bash
# Send OTP (authenticated)
curl -X POST http://localhost:8888/auth/send-verification-otp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Verify OTP
curl -X POST http://localhost:8888/auth/verify-email-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Resend OTP
curl -X POST http://localhost:8888/auth/resend-verification-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Troubleshooting

### Common Issues

1. **OTP not received**: Check spam folder, verify email configuration
2. **Rate limit errors**: Wait for the specified time before retrying
3. **Invalid OTP errors**: Ensure correct 6-digit code entry
4. **Expired OTP**: Request a new OTP code

### Debugging Tips

- Check server logs for email sending errors
- Verify database fields are properly updated
- Ensure email templates are compiled correctly
- Test with different email providers

## Future Enhancements

Potential improvements for future versions:

- **SMS OTP support** for phone number verification
- **Configurable OTP length** and expiration times
- **Backup codes** for account recovery
- **Two-factor authentication** integration
- **Analytics dashboard** for verification metrics

---

## Support

For technical support or questions about the OTP verification system, please:

1. Check this documentation first
2. Review the API endpoint documentation in Swagger
3. Check server logs for specific error messages
4. Contact the development team with specific error details
