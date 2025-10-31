# System URL Configuration

This document explains how to configure system URLs for the authentication microservice when deployed in a microservices architecture.

## Overview

The authentication service can redirect users to different system interfaces after login. Instead of serving templates locally, it redirects to external URLs configured via environment variables.

## Environment Variables

Configure the following environment variables in your `.env` file or deployment environment:

### System-Specific URLs

- `TTS_SYSTEM_URL` - URL for the TTS (Transportation Tracking System) interface
- `AMS_SYSTEM_URL` - URL for the AMS (Asset Management System) interface  
- `HDTS_SYSTEM_URL` - URL for the HDTS (Human Development & Training System) interface
- `BMS_SYSTEM_URL` - URL for the BMS (Building Management System) interface
- `DEFAULT_SYSTEM_URL` - Fallback URL for unknown systems or users without system access

### Development Example

```bash
TTS_SYSTEM_URL=http://localhost:3000/tts
AMS_SYSTEM_URL=http://localhost:3000/ams
HDTS_SYSTEM_URL=http://localhost:3000/hdts
BMS_SYSTEM_URL=http://localhost:3000/bms
DEFAULT_SYSTEM_URL=http://localhost:3000/dashboard
```

### Production Example

```bash
TTS_SYSTEM_URL=https://tts.yourdomain.com
AMS_SYSTEM_URL=https://ams.yourdomain.com
HDTS_SYSTEM_URL=https://hdts.yourdomain.com
BMS_SYSTEM_URL=https://bms.yourdomain.com
DEFAULT_SYSTEM_URL=https://dashboard.yourdomain.com
```

## How It Works

1. **User Authentication**: User logs in through the authentication service
2. **System Selection**: User selects or is assigned to a system
3. **JWT Token Generation**: Authentication service generates JWT tokens
4. **Redirect with Context**: User is redirected to the appropriate system URL with:
   - `user_id` - The authenticated user's ID
   - `system` - The system slug
   - `token` - JWT access token for SSO (optional)

### Redirect URL Format

```
{SYSTEM_URL}?user_id={user_id}&system={system_slug}&token={jwt_token}
```

Example:
```
https://tts.yourdomain.com?user_id=123&system=tts&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Receiving System Implementation

The receiving system (TTS, AMS, HDTS, BMS) should:

1. **Extract Parameters**: Get `user_id`, `system`, and `token` from query parameters
2. **Validate JWT**: Verify the JWT token against the authentication service
3. **Authenticate User**: Use the token to authenticate the user session
4. **System Access**: Verify user has access to the requested system

### Example Implementation (Frontend)

```javascript
// Extract URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const systemSlug = urlParams.get('system');
const jwtToken = urlParams.get('token');

// Set JWT token in storage/cookies for subsequent API calls
if (jwtToken) {
    localStorage.setItem('access_token', jwtToken);
    // or set as cookie
    document.cookie = `access_token=${jwtToken}; path=/; SameSite=Lax`;
}

// Verify token and get user info
fetch('/api/verify-token', {
    headers: {
        'Authorization': `Bearer ${jwtToken}`
    }
})
.then(response => response.json())
.then(userData => {
    // Initialize user session
    initializeUserSession(userData);
})
.catch(error => {
    // Redirect back to auth service if token invalid
    window.location.href = 'https://auth.yourdomain.com/login';
});
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Token Validation**: Receiving systems must validate JWT tokens
3. **CORS Configuration**: Ensure proper CORS settings between services
4. **Token Expiry**: Handle token refresh appropriately
5. **System Access**: Verify user permissions for the target system

## Deployment Notes

- Each system can be deployed independently
- Authentication service acts as a central SSO provider
- Systems communicate via JWT tokens
- No shared database required between systems
- Each system maintains its own business logic and data

## Troubleshooting

### Common Issues

1. **Invalid Redirect URL**: Check environment variables are set correctly
2. **CORS Errors**: Ensure CORS_ALLOWED_ORIGINS includes all system URLs
3. **Token Issues**: Verify JWT configuration matches between services
4. **System Access Denied**: Check user has appropriate system roles

### Debug Mode

In development, you can check the redirect URLs by looking at the Django logs or adding debug prints to the `get_system_redirect_url` function.