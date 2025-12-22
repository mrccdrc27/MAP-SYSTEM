# User Login Flow - Staff Login with Optional OTP

## Overview
The login system supports both regular login and two-factor authentication (2FA) via OTP. All paths require reCAPTCHA verification on the initial login attempt.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  User visits /staff/login/                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │  Enter Email + Password + CAPTCHA      │
          │  Submit to POST /staff/login/  │
          └────────────────┬───────────────┘
                           │
                    ┌──────▼──────┐
                    │   Validate   │
                    │   Captcha    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────────────────────┐
                    │  Check if user has          │
                    │  otp_enabled = True?        │
                    └──────┬──────────┬────────────┘
                           │          │
          ┌────────────────┘          └────────────────┐
          │                                             │
    ┌─────▼──────────────┐                   ┌────────▼──────────────┐
    │  NO OTP ENABLED    │                   │  OTP ENABLED           │
    └─────┬──────────────┘                   └────────┬───────────────┘
          │                                           │
          │                                    ┌──────▼──────────────┐
          │                                    │  Generate OTP        │
          │                                    │  Send via Email      │
          │                                    │  Return OTP Form     │
          │                                    │  (two_factor_required│
          │                                    │   =True)             │
          │                                    └──────┬───────────────┘
          │                                           │
          │                                    ┌──────▼──────────────┐
          │                                    │  User enters OTP     │
          │                                    │  Submit form with    │
          │                                    │  otp_code field      │
          │                                    └──────┬───────────────┘
          │                                           │
          │                                    ┌──────▼──────────────┐
          │                                    │  Verify OTP Code     │
          │                                    │  (in LoginView)      │
          │                                    └──────┬───────────────┘
          │                                           │
          └──────────────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │  Generate JWT Tokens using    │
                    │  CustomTokenObtainPairSerializer  │
                    │  (email + password +          │
                    │   optional otp_code)          │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │  Set Cookies:                 │
                    │  - access_token              │
                    │  - refresh_token             │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │  Redirect to System Selection │
                    │  or Single System             │
                    └──────────────────────────────┘
```

---

## Endpoints

### 1. Form-Based Login
**Path:** `POST /staff/login/`  
**View:** `LoginView` (Django FormView)  
**Template:** `auth/templates/users/login.html`

**Flow:**
1. **First Submission (Email + Password + Captcha)**
   - Validates reCAPTCHA token
   - Checks login rate limits
   - Authenticates user credentials
   - If user has `otp_enabled=True`:
     - Stores email/password in session
     - Returns login form with `two_factor_required=True` context
     - Frontend displays OTP input field
   - If no OTP:
     - Generates JWT tokens via `CustomTokenObtainPairSerializer`
     - Sets cookies and redirects to system

2. **Second Submission (with OTP Code)**
   - Retrieves email/password from session
   - Validates OTP code against `UserOTP` model
   - Generates JWT tokens via `CustomTokenObtainPairSerializer`
   - Sets cookies and redirects to system

**Request Data (Form Submission):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "captcha": "reCAPTCHA_token_string",
  "otp_code": "123456",  // Only on second submission
  "remember_me": "on"    // Optional
}
```

**Response (if OTP required):**
- HTTP 200 (HTML form with OTP field visible)
- Context: `two_factor_required=True`

**Response (if successful):**
- HTTP 302 Redirect
- Cookies set: `access_token`, `refresh_token`
- Redirect to: System selection page or single system

**Response (if failed):**
- HTTP 302 Redirect back to login
- Django messages with error

---

### 2. API-Based Login (for SPA/Future Use)
**Path:** `POST /api/v1/users/login/api/`  
**View:** `LoginAPIView` (Django REST APIView)

**Flow:**
1. Validates reCAPTCHA token
2. Authenticates user credentials
3. If user has `otp_enabled=True`:
   - Generates temporary token with `temp_otp_login=True` flag
   - Returns temporary token + OTP required message
4. If no OTP:
   - Generates full JWT tokens
   - Returns access_token + refresh_token

**Request Data (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "g_recaptcha_response": "reCAPTCHA_token_string"
}
```

**Response (if OTP required):**
```json
{
  "otp_required": true,
  "temporary_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "message": "Two-factor authentication required",
  "user": {
    "email": "user@example.com",
    "id": 1
  }
}
```

**Response (if successful):**
```json
{
  "success": true,
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### 3. OTP Verification (API Endpoint)
**Path:** `POST /api/v1/users/login/verify-otp/`  
**View:** `VerifyOTPLoginView` (Django REST APIView)  
**Requires:** No reCAPTCHA ✅

**Flow:**
1. Decodes temporary token (must have `temp_otp_login=True`)
2. Retrieves user from token
3. Validates OTP code
4. Generates full JWT tokens using `CustomTokenObtainPairSerializer`
5. Returns access_token + refresh_token

**Request Data (JSON):**
```json
{
  "temporary_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "otp_code": "123456"
}
```

**Response (if successful):**
```json
{
  "success": true,
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "email": "user@example.com",
    "id": 1
  },
  "systems": [
    {
      "system_name": "Ticket Tracking System",
      "system_slug": "tts",
      "role_name": "Agent"
    }
  ]
}
```

**Response (if OTP expired):**
```json
{
  "success": false,
  "error": "OTP expired. Please request a new one.",
  "otp_expired": true
}
```

---

## Security Requirements

| Requirement | Staff Login | OTP Verification |
|-------------|-----------|-----------------|
| reCAPTCHA Required | ✅ YES | ❌ NO |
| Rate Limiting | ✅ YES | ✅ YES |
| Token Type | Full JWT | Full JWT |
| Serializer | CustomTokenObtainPairSerializer | CustomTokenObtainPairSerializer |
| Session Required | ✅ (for form flow) | ❌ (stateless API) |

---

## Token Generation

Both flows use the same `CustomTokenObtainPairSerializer`:

```python
serializer_data = {
    'username': user.email,
    'email': user.email,
    'password': password,  # Original password in form flow
    'otp_code': otp_code   # Optional, only if 2FA enabled
}

serializer = CustomTokenObtainPairSerializer(
    data=serializer_data,
    context={'request': request}
)
```

**Tokens Generated:**
- `access_token`: Short-lived JWT (default: 5 minutes)
- `refresh_token`: Long-lived JWT (default: 7 days)

**Token Customizations:**
- If `remember_me=True`: Extended expiration (30 days)
- Custom claims added by `CustomTokenObtainPairSerializer`

---

## Frontend Implementation

### Step 1: Detect OTP Requirement
```javascript
// Check server context
const twoFactorRequired = '{{ two_factor_required|default:False }}'.toLowerCase() === 'true';
if (twoFactorRequired) {
    // Show OTP input field
    otpMode.classList.add('active');
}
```

### Step 2: Handle reCAPTCHA
```javascript
// Get reCAPTCHA response
const recaptchaResponse = grecaptcha.getResponse();

// Add to form before submission
const input = document.createElement('input');
input.name = 'captcha';
input.value = recaptchaResponse;
form.appendChild(input);
```

### Step 3: Submit Form
```javascript
// First submission: email + password + captcha
// Server returns: OTP form or redirects to system

// Second submission (if OTP required): email + password + otp_code + captcha
// Server returns: redirect to system
```

---

## Database Models

### UserOTP
- `user`: ForeignKey to User
- `code`: 6-digit OTP code
- `created_at`: Timestamp
- `expires_at`: 5 minutes from creation
- Methods:
  - `generate_for_user(user)`: Create new OTP
  - `get_valid_otp_for_user(user)`: Retrieve valid (non-expired) OTP
  - `verify(code)`: Verify code and mark as used

### User
- `email`: User email
- `password`: Hashed password
- `otp_enabled`: Boolean, default=False
- `failed_login_attempts`: Integer counter
- `is_locked`: Boolean account lock status
- `lockout_time`: Timestamp when locked

---

## Error Handling

| Scenario | Status | Message |
|----------|--------|---------|
| Invalid captcha | Form re-render | "Please solve the captcha correctly." |
| Invalid credentials | 302 Redirect | "Invalid email or password." |
| OTP required | 200 with OTP form | "Two-Factor Authentication enabled" |
| Invalid OTP | Form re-render | "Invalid OTP code. Please try again." |
| Expired OTP | Form re-render | "OTP has expired. Please request a new one." |
| Rate limited (IP) | 302 Redirect | "Too many login attempts. Please try again later." |
| Account locked | 302 Redirect | "Your account is locked. Please contact support." |
| Expired token | 401 Unauthorized | "Invalid or expired token. Please log in again." |

---

## Session Management

### Form-Based Flow (LoginView)
- **OTP Email in Session:** `request.session['otp_email']`
- **OTP Password in Session:** `request.session['otp_password']`
- **Cleared after:** Successful OTP verification or logout

### API Flow (VerifyOTPLoginView)
- **No session storage** - Stateless, uses JWT tokens

---

## Rate Limiting Strategy

**Tracked By:**
1. IP Address (max 10 attempts / 15 minutes)
2. Device Fingerprint (max 10 attempts / 15 minutes)
3. Email Address (max 10 attempts / 15 minutes)

**Actions:**
- Failed attempts increment counters
- Successful login resets counters
- Account locked after 10 failed attempts in 15 minutes
- Locked accounts require manual unlock or timeout

---

## Future Enhancements

1. **Email Verification** - Verify OTP before final login
2. **Backup Codes** - Generate recovery codes for 2FA
3. **SMS OTP** - Add SMS as OTP delivery method
4. **TOTP** - Support Time-based OTP (Google Authenticator)
5. **WebAuthn** - Hardware security key support
6. **Passwordless** - Magic links or device-based authentication
