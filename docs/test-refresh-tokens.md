# Refresh Token System Test Guide

## Overview

This guide helps you test the newly implemented refresh token system.

## New Endpoints

### 1. Login (Updated)

- **POST** `/auth/login`
- **Response**: Now includes both `accessToken` and `refreshToken`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }
}
```

### 2. Refresh Token

- **POST** `/auth/refresh`
- **Body**: `{ "refreshToken": "your_refresh_token_here" }`
- **Response**: New access and refresh tokens

### 3. Logout

- **POST** `/auth/logout`
- **Body**: `{ "refreshToken": "your_refresh_token_here" }`
- **Response**: `{ "message": "Logout successful" }`

### 4. Revoke All Tokens

- **POST** `/auth/revoke-all-tokens`
- **Headers**: `Authorization: Bearer your_access_token_here`
- **Response**: `{ "message": "All tokens revoked successfully" }`

## Configuration Changes

### Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your_access_token_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_token_secret_key
JWT_REFRESH_EXPIRES_IN=7d
```

## Security Features

1. **Token Types**: Access tokens are for API access, refresh tokens are for token renewal
2. **Token Rotation**: Each refresh generates new access AND refresh tokens
3. **Token Versioning**: Incrementing token version invalidates all existing tokens
4. **Shorter Access Token Expiry**: Default 15 minutes (configurable)
5. **Longer Refresh Token Expiry**: Default 7 days (configurable)
6. **Database Storage**: Refresh tokens are stored and validated against the database

## Testing Steps

1. **Login** and save both tokens
2. **Use access token** for API calls
3. **When access token expires**, use refresh token to get new tokens
4. **Test logout** to revoke refresh token
5. **Test revoke-all-tokens** for security scenarios

## Migration Notes

- Existing users will need to login again to get refresh tokens
- Old access tokens will continue to work until they expire
- Database schema includes new fields: `refreshToken`, `refreshTokenExpires`, `tokenVersion`
