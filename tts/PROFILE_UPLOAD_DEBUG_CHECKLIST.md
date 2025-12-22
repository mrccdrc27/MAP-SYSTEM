# Profile Image Upload Debug Checklist

## Complete Step-by-Step Debugging Guide

Your admin settings page is at: `http://localhost:5173/admin/settings`

The upload flow should look like:
```
1. CoordinatorAdminSettings (admin wrapper)
   ↓
2. EmployeeSettings (logs: 💾 [SETTINGS])
   ↓
3. employeeService.uploadEmployeeImage() (logs: 🚀 [FRONTEND])
   ↓
4. Helpdesk Backend POST /api/employee/upload-image/ (logs: [UPLOAD_PROFILE_IMAGE])
   ↓
5. Auth Service PATCH /api/v1/users/profile/ (logs: [AUTH_PROFILE_UPDATE])
   ↓
6. Database: users_user.profile_picture updated
```

---

## Step 1: Open Browser Console (F12)

1. Open your browser DevTools: **F12** or **Right-click → Inspect**
2. Click on the **Console** tab
3. Make sure you see the console output (sometimes needs refresh)
4. Type `localStorage.getItem('access_token')` and press Enter - should show a token

If no token appears:
- ❌ **You are not logged in**
- Go to login page first

If token appears:
- ✅ **Proceed to Step 2**

---

## Step 2: Navigate to Admin Settings

1. Go to `http://localhost:5173/admin/settings`
2. You should see the CoordinatorAdminSettings component with a profile section
3. **Clear console** (right-click → Clear Console or type `clear()`)

---

## Step 3: Select & Upload Image

1. Click the profile image or file input to select an image
2. Click **Save Changes** button
3. **Immediately watch the console**

You should see logs starting with:
- 💾 [SETTINGS] - from EmployeeSettings.jsx
- 🚀 [FRONTEND] - from employeeService.js

### If you see 💾 [SETTINGS] logs:

✅ **EmployeeSettings component is executing**

Check the logs:
```
💾 [SETTINGS] handleSaveChanges START - Selected file: ...
💾 [SETTINGS] Token present: true
💾 [SETTINGS] Calling backendEmployeeService.uploadEmployeeImage()...
```

**Next:** Look for 🚀 [FRONTEND] logs

### If you DON'T see 💾 [SETTINGS] logs:

❌ **Problem: EmployeeSettings.handleSaveChanges NOT being called**

Possible causes:
1. **CoordinatorAdminSettings not loading EmployeeSettings**
   - Check Network tab → check if page JS loaded correctly
   - Check browser console for any React errors
   - Check if there's a different admin page being loaded
   
2. **File not being selected properly**
   - Try selecting the file again
   - Check that the file input element exists in the UI
   
3. **Save button not calling handleSaveChanges**
   - Check React DevTools if available
   - Click the Save button and watch console very carefully

**Action:** Take a screenshot of what you see and check what component is actually rendering at `/admin/settings`

---

## Step 4: Check for 🚀 [FRONTEND] logs

### If you see 🚀 [FRONTEND] logs:

✅ **Frontend service is executing**

Check these logs:
```
🚀 [FRONTEND] uploadEmployeeImage START
🚀 [FRONTEND] Endpoint: http://localhost:8000/api/employee/upload-image/
🚀 [FRONTEND] Image file: [filename.jpg] image/jpeg [size]
🚀 [FRONTEND] BASE_URL: http://localhost:8000
🚀 [FRONTEND] Response received
🚀 [FRONTEND] Response status: 200
✅ [FRONTEND] Upload successful
```

**Most important:** What is the `Endpoint:` showing?
- Should be: `http://localhost:8000/api/employee/upload-image/`
- If different, that's your problem!
- If it shows port 8003, 8004, etc., update the configuration

What is the `Response status:`?
- `200` = Success (backend received request) → Check backend logs
- `401` = Unauthorized (token issue)
- `404` = Endpoint not found (wrong URL!)
- `500` = Server error (check backend logs)
- `0` = No response (request never reached backend)

### If you DON'T see 🚀 [FRONTEND] logs:

❌ **Problem: Frontend service not being called**

1. Check the 💾 [SETTINGS] logs - are they showing?
   - If NO: Problem is in EmployeeSettings component
   - If YES: Problem is between EmployeeSettings and employeeService
   
2. Check for JavaScript errors in console
   - Look for red error messages
   - Check the Stack Trace

---

## Step 5: Check Backend Logs

### Terminal running helpdesk backend (port 8000)

You should see logs like:
```
================================================================================
[UPLOAD_PROFILE_IMAGE] ✓✓✓ START - New request received
[REQUEST] User: [user_id]
[FILES] Files in request: ['image']
[FILE_CHECK] File exists and has size
[PROCESSING] Saving to Employee.image...
[DATABASE] Image saved successfully!
[AUTH_SYNC] ✓ Starting auth service sync...
[AUTH_SYNC] ✓ RESPONSE RECEIVED from auth service
[AUTH_SYNC] ✓✓✓ SUCCESS: Profile picture synced to auth service!
================================================================================
```

### If you DON'T see these logs:

❌ **Problem: Request not reaching helpdesk backend**

Possible causes:
1. **Wrong endpoint URL** - Check 🚀 [FRONTEND] logs for actual endpoint
2. **Backend not running** - Is the helpdesk backend running on port 8000?
   - Verify: `curl http://localhost:8000/api/employee/profile/` in terminal
3. **Firewall blocking request** - Try pinging localhost:8000
4. **CORS error** - Check Network tab for blocked requests
5. **Wrong BASE_URL** - Check API_CONFIG in frontend environment

---

## Step 6: Check Auth Service Logs

### Terminal running auth service (port 8003)

You should see logs like:
```
[AUTH_PROFILE_UPDATE] User instance: User(id=123)
[AUTH_PROFILE_UPDATE] User is authenticated
[SERIALIZER] validate_profile_picture() called
[SERIALIZER] File: [filename.jpg] size: [size] bytes
[SERIALIZER] update() called
[SERIALIZER] instance.profile_picture after update: profile_pics/123_profile.jpg
✓✓✓ SUCCESS: Profile updated in auth service
```

### If you DON'T see these logs:

❌ **Problem: Auth service not receiving sync request**

This means the helpdesk backend is not calling the auth service.

Check helpdesk backend logs for:
```
[AUTH_SYNC] ✗ SYNC FAILED: [error message]
```

Or check if there's an error about missing auth service token.

---

## Step 7: Verify Database

### Check if profile_picture was actually saved

Open a terminal in the workspace root and run:

```bash
# Connect to auth service database
cd auth
python manage.py shell
```

Then in the Python shell:
```python
from users.models import User
user = User.objects.get(id=1)  # Replace 1 with your user ID
print("profile_picture:", user.profile_picture)
print("profile_picture.name:", user.profile_picture.name if user.profile_picture else "None")
print("profile_picture.url:", user.profile_picture.url if user.profile_picture else "None")
```

Expected output if successful:
```
profile_picture: profile_pics/1_[timestamp].jpg
profile_picture.name: profile_pics/1_[timestamp].jpg
profile_picture.url: /media/profile_pics/1_[timestamp].jpg
```

If `profile_picture` is empty/None:
- ❌ Data is not being saved to database
- Check the logs from Step 5 & 6 for where the save is failing

---

## Decision Tree

```
Start
  ↓
Can you see 💾 [SETTINGS] logs? 
  ├─ NO → Problem in EmployeeSettings component
  │        Check if CoordinatorAdminSettings is loading EmployeeSettings
  │        Check if file is being selected
  │        Check for React errors in console
  │
  └─ YES → Can you see 🚀 [FRONTEND] logs?
             ├─ NO → Problem between EmployeeSettings and employeeService
             │        Check for JS errors in console
             │        Check if backend service URL is correct
             │
             └─ YES → Check 🚀 response status
                       ├─ 200 → Can you see [UPLOAD_PROFILE_IMAGE] logs?
                       │        ├─ NO → Backend received request but didn't log?
                       │        │        Check if logging is enabled
                       │        │        Check if endpoint is different
                       │        │
                       │        └─ YES → Can you see [AUTH_PROFILE_UPDATE] logs?
                       │                 ├─ NO → Auth service not receiving sync
                       │                 │        Check helpdesk AUTH_SYNC logs
                       │                 │        Check for token/auth errors
                       │                 │
                       │                 └─ YES → Database not updated?
                       │                          Check if serializer.update() is running
                       │                          Check for SQL errors
                       │
                       ├─ 401 → Token problem
                       │        Check token in localStorage
                       │        Check token expiration
                       │        Check auth headers in request
                       │
                       ├─ 404 → Endpoint not found!
                       │        Check endpoint URL in 🚀 logs
                       │        Check if backend is on correct port
                       │        Check URL routing in backend
                       │
                       ├─ 500 → Backend server error
                       │        Check backend terminal for Python errors
                       │        Check database connection
                       │
                       └─ 0 → No response (network error)
                              Check if backend is running
                              Check CORS settings
                              Check firewall
```

---

## Copy-Paste Commands for Testing

### Test if backend is running:
```bash
curl -X GET http://localhost:8000/api/employee/profile/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Test if auth service is running:
```bash
curl -X GET http://localhost:8003/api/v1/users/profile/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Get your token:
In browser console:
```javascript
console.log(localStorage.getItem('access_token'))
```

### Check database directly:
```bash
cd auth
python manage.py shell
from users.models import User
for u in User.objects.all(): print(f"User {u.id}: profile_picture={u.profile_picture.name if u.profile_picture else 'None'}")
exit()
```

---

## Report Template

When reporting the issue, provide:

1. **Screenshot of Console** - All logs from upload attempt
2. **What endpoint is being called?** - From 🚀 [FRONTEND] logs
3. **What response status?** - From 🚀 [FRONTEND] logs  
4. **Backend logs** - Copy-paste from helpdesk terminal
5. **Auth service logs** - Copy-paste from auth service terminal
6. **Database check** - Output from shell check above
7. **Which services running?** - Are all 3 running? (frontend on 5173, helpdesk on 8000, auth on 8003)

This will pinpoint exactly where the failure is!
