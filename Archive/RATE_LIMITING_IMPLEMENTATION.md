# Rate Limiting Implementation Summary

## Overview
Replaced the old per-user account lockout system with a sophisticated IP and device fingerprint-based rate limiting system that detects brute force attacks at the network level before showing CAPTCHAs to legitimate users.

## Why This Approach?

**Old System Problems:**
- Showed CAPTCHAs only after 5 failed attempts on a specific account
- Legitimate users with typos got blocked quickly
- Attackers could easily try multiple accounts without CAPTCHA

**New System Benefits:**
1. **IP-Level Protection (Strict)**
   - Blocks aggressive attackers at the network level
   - Detects coordinated attacks across multiple accounts
   - Hard limit of 10 failed attempts → 30 min IP block

2. **Device-Level Protection (Soft)**
   - Browser fingerprint (User-Agent, Accept-Language, etc.)
   - Graduated response:
     - 5 attempts: CAPTCHA required (soft block)
     - 8+ attempts: Blocked for 20 minutes (hard block)
   - Allows legitimate users with typos to eventually succeed with CAPTCHA

3. **Per-Account Protection (Legacy)**
   - Still maintains user.failed_login_attempts
   - Still maintains user.is_locked status
   - Adds defense in depth

## New Models

### `IPAddressRateLimit`
```python
- ip_address: Unique IP being tracked
- failed_attempts: Count of failed login attempts
- last_attempt: When the last attempt occurred
- blocked_until: Until when the IP is blocked
```

**Thresholds:**
- 10 failed attempts per IP → Block for 30 minutes
- Automatically unblocks after duration expires

### `DeviceFingerprint`
```python
- fingerprint_hash: SHA256 hash of browser characteristics
- failed_attempts: Count of failed login attempts from device
- requires_captcha: Boolean flag for CAPTCHA requirement
- blocked_until: Until when the device is blocked
```

**Thresholds:**
- 5 failed attempts → Require CAPTCHA
- 8 failed attempts → Block device for 20 minutes

### `RateLimitConfig`
Configuration model for adjusting thresholds without code changes:
- `ip_attempt_threshold`: Default 10
- `ip_block_duration_minutes`: Default 30
- `device_attempt_threshold`: Default 5 (triggers CAPTCHA)
- `device_captcha_threshold`: Default 8 (triggers block)
- `device_block_duration_minutes`: Default 20
- `attempt_reset_hours`: Default 24

## New Utility Module: `rate_limiting.py`

### Key Functions:

1. **`get_client_ip(request)`**
   - Extracts real IP from request
   - Handles proxies (X-Forwarded-For, X-Real-IP)

2. **`generate_device_fingerprint(request)`**
   - Creates SHA256 hash of:
     - User-Agent
     - Accept-Language
     - Accept-Encoding
     - Remote IP
   - Unique per browser/device

3. **`check_login_rate_limits(request)`**
   - Combined check of IP and device limits
   - Returns: `login_allowed`, `captcha_required`, `blocked_reason`, `blocked_until`

4. **`record_failed_login_attempt(request)`**
   - Called on failed login
   - Increments both IP and device counters
   - Logs violation with details

5. **`record_successful_login(request)`**
   - Called on successful login
   - Resets both IP and device counters
   - Logs successful auth

## Integration Points

### LoginView.post()
```python
# Check rate limits first
rate_limit_check = check_login_rate_limits(request)

# If IP is blocked, deny immediately
if not rate_limit_check['login_allowed']:
    return error_response

# Use device-level CAPTCHA requirement in form
```

### LoginView.form_invalid()
- Calls `record_failed_login_attempt()` on any form error

### LoginView.form_valid()
- Calls `record_successful_login()` on successful authentication

## Admin Panel Features

### IPAddressRateLimit Admin
- List view: IP, attempt count, last attempt, blocked until
- Actions: Reset attempts, Unblock IP
- Filters: By blocked status and timestamp

### DeviceFingerprint Admin
- List view: Device hash, attempt count, CAPTCHA status, blocked until
- Actions: Reset attempts, Unblock device
- Filters: By CAPTCHA requirement and blocked status

### RateLimitConfig Admin
- Single configuration object
- Organized fieldsets for IP and device settings
- Prevents accidental deletion or duplication

## Migration

New migration file: `0005_rate_limiting.py`
- Creates `IPAddressRateLimit` table
- Creates `DeviceFingerprint` table
- Creates `RateLimitConfig` table
- No data loss - legacy user fields remain

## How It Works (Example Scenario)

**Scenario: Attacker tries 15 different accounts from same IP**

1. Attempt 1-10 (from IP):
   - Device fingerprint: CAPTCHA shown after 5 attempts
   - IP tracking: Incrementing counter

2. Attempt 11:
   - IP check: Blocked (10 threshold reached)
   - Return: "Too many login attempts. Try later."
   - IP blocked for 30 minutes

**Scenario: Legitimate user with typo**

1. Attempt 1: Wrong password
   - Device counter: 1/5
   - No CAPTCHA yet

2. Attempt 2: Wrong password again
   - Device counter: 2/5
   - No CAPTCHA yet

3. Attempt 3: Wrong password, third time
   - Device counter: 3/5
   - No CAPTCHA yet

4. Attempt 4-5: Still wrong
   - Device counter: 5/5
   - **CAPTCHA now required** (soft block)

5. Attempt 6: Right password + CAPTCHA
   - Success! Login works
   - Device counter resets to 0
   - IP counter resets to 0

## Configuration via Admin Panel

1. Go to Django admin `/admin/`
2. Find "Rate Limit Configuration"
3. Click to edit thresholds
4. Save changes (takes effect immediately)

**Never show CAPTCHA for first 5 device attempts!**
