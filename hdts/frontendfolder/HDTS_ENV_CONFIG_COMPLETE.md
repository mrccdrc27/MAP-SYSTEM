# HDTS Frontend Environment Configuration Complete

## Summary of Changes

The HDTS frontend has been properly configured to use environment variables for all service domains instead of hardcoding URLs. This allows for easy deployment across different environments (local, staging, production).

## Environment Variables Created

### 4 Core Service Domain Variables:

1. **`VITE_AUTH_URL`** - Auth Service
   - User authentication, roles, permissions management
   - Local: `http://localhost:8003`
   - Production: `https://your-auth-service.railway.app`

2. **`VITE_HDTS_BACKEND_URL`** - HDTS Backend Service
   - Helpdesk tickets, articles, core HDTS functionality
   - Routes through Kong Gateway with `/helpdesk` prefix
   - Local: `http://localhost:8000/helpdesk`
   - Production: `https://your-kong-gateway.railway.app/helpdesk`

3. **`VITE_WORKFLOW_API_URL`** - Workflow API Service
   - TTS workflow engine integration
   - Routes through Kong Gateway with `/workflow` prefix
   - Local: `http://localhost:8000/workflow`
   - Production: `https://your-kong-gateway.railway.app/workflow`

4. **`VITE_MESSAGING_API_URL`** & **`VITE_MESSAGING_WS_URL`** - Messaging Service
   - Real-time messaging and WebSocket connections
   - HTTP API Local: `http://localhost:8005`
   - WebSocket Local: `ws://localhost:8005`
   - Production HTTP: `https://your-messaging-service.railway.app`
   - Production WebSocket: `wss://your-messaging-service.railway.app`

### Additional Variables:

- **`VITE_MEDIA_URL`** - Media file URLs (attachments, profile images)
- **`VITE_OPENROUTER_API_KEY`** - AI features integration

## Files Modified

### 1. `.env.example`
- Added comprehensive environment variable documentation
- Organized into logical sections with clear comments
- Provided both local and production examples
- Marked legacy variables as deprecated

### 2. `src/config/environment.js`
- Updated `API_CONFIG.BACKEND` to use `VITE_HDTS_BACKEND_URL`
- Updated `API_CONFIG.AUTH` to use `VITE_AUTH_URL`
- Renamed `TTS_WORKFLOW` to `WORKFLOW` and use `VITE_WORKFLOW_API_URL`
- Added `API_CONFIG.MESSAGING` with both HTTP and WebSocket URLs
- Maintained backward compatibility with legacy variable names

### 3. `src/shared/hooks/messaging/useWebSocketMessaging.jsx`
- Simplified WebSocket URL configuration to use `API_CONFIG.MESSAGING.WS_URL`
- Removed complex fallback logic

### 4. `src/shared/hooks/messaging/useMessagingAPI.jsx`
- Simplified messaging API URL to use `API_CONFIG.MESSAGING.BASE_URL`

### 5. `src/services/backend/ticketService.js`
- Updated to use `API_CONFIG.WORKFLOW.BASE_URL` instead of `TTS_WORKFLOW`

### 6. `src/utilities/secureMedia.js`
- Removed hardcoded `localhost:8000` and `localhost:8003` URLs
- Uses `API_CONFIG.BACKEND.BASE_URL` as fallback for media URLs
- Properly imports and uses the centralized configuration

## Configuration Architecture

```
.env or .env.example
       ↓
import.meta.env.VITE_*
       ↓
src/config/environment.js (API_CONFIG)
       ↓
Service files (apiService.js, ticketService.js, etc.)
       ↓
Components and Hooks
```

## Usage for Deployment

### Local Development:
```bash
# Copy .env.example to .env
cp .env.example .env

# Use default local values (already configured)
# Start the dev server
npm run dev
```

### Production Deployment:
Update the `.env` file with production URLs:
```env
VITE_AUTH_URL="https://smartsupport-auth.railway.app"
VITE_HDTS_BACKEND_URL="https://smartsupport-gateway.railway.app/helpdesk"
VITE_WORKFLOW_API_URL="https://smartsupport-gateway.railway.app/workflow"
VITE_MESSAGING_API_URL="https://smartsupport-messaging.railway.app"
VITE_MESSAGING_WS_URL="wss://smartsupport-messaging.railway.app"
VITE_MEDIA_URL="https://smartsupport-gateway.railway.app/helpdesk/media/"
```

## Backward Compatibility

The configuration maintains backward compatibility with:
- `VITE_API_URL` (maps to `VITE_HDTS_BACKEND_URL`)
- `VITE_TTS_WORKFLOW_URL` (maps to `VITE_WORKFLOW_API_URL`)

This ensures existing deployments continue to work while providing clearer naming for new deployments.

## Benefits

✅ **No Hardcoded URLs** - All service endpoints configurable via environment variables
✅ **Clear Separation** - Each service has its own dedicated configuration
✅ **Easy Deployment** - Simple .env file changes for different environments
✅ **Centralized Config** - Single source of truth in `environment.js`
✅ **Production Ready** - Proper configuration for Railway/cloud deployments
✅ **Well Documented** - Clear comments explaining each variable's purpose

## Testing

To verify the configuration:

1. Check environment variables are loaded:
   ```javascript
   console.log(import.meta.env.VITE_AUTH_URL);
   console.log(import.meta.env.VITE_HDTS_BACKEND_URL);
   console.log(import.meta.env.VITE_WORKFLOW_API_URL);
   console.log(import.meta.env.VITE_MESSAGING_API_URL);
   ```

2. Check API_CONFIG values:
   ```javascript
   import { API_CONFIG } from './config/environment';
   console.log(API_CONFIG.AUTH.BASE_URL);
   console.log(API_CONFIG.BACKEND.BASE_URL);
   console.log(API_CONFIG.WORKFLOW.BASE_URL);
   console.log(API_CONFIG.MESSAGING.BASE_URL);
   console.log(API_CONFIG.MESSAGING.WS_URL);
   ```

3. Test API calls to each service to ensure proper routing

## Next Steps

1. Update production `.env` with actual production URLs
2. Test all service connections in both local and production environments
3. Remove commented legacy variables after confirming production deployments work
4. Update deployment documentation to reference new variable names
