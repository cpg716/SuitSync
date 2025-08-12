# Authentication Troubleshooting Guide

## Overview

SuitSync uses a hybrid authentication system that requires either:
1. **Lightspeed OAuth2 authentication** (primary method)
2. **User selection from active sessions** (for development/testing)

## Common Issues

### 401 Unauthorized Errors

If you're getting 401 errors when accessing API endpoints like `/api/stats/dashboard` or `/api/sales/recent`, it means you need to authenticate.

#### Solution 1: Use the Quick Authentication Script

For development and testing, you can use the provided authentication script:

```bash
cd backend
node quick-fix-auth.js
```

This script will:
1. Set up development authentication using the personal access token
2. Test authentication with the stats and sales endpoints
3. Verify all endpoints are working properly

#### Solution 2: Manual Authentication

If you prefer to authenticate manually:

1. **Check for active users:**
   ```bash
   curl -b cookies.txt -c cookies.txt http://localhost:3000/api/user-selection/active-users
   ```

2. **Select a user:**
   ```bash
   curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/user-selection/select-user \
     -H "Content-Type: application/json" \
     -d '{"lightspeedUserId":"USER_ID_HERE"}'
   ```

3. **Test authentication:**
   ```bash
   curl -b cookies.txt -c cookies.txt http://localhost:3000/api/stats/dashboard
   ```

#### Solution 3: Lightspeed OAuth2 Authentication

For production use, authenticate with Lightspeed:

1. **Start OAuth flow:**
   ```bash
   curl -i http://localhost:3000/api/auth/start
   ```

2. **Follow the redirect URL** to complete OAuth2 authentication

3. **Return to the application** - you should now be authenticated

## Authentication Flow

### User Selection Flow (Development)
```
1. Check active sessions → GET /api/user-selection/active-users
2. Select user → POST /api/user-selection/select-user
3. Session now has selectedUser → API endpoints accessible
```

### Lightspeed OAuth2 Flow (Production)
```
1. Start OAuth → GET /api/auth/start
2. Redirect to Lightspeed → User authenticates
3. Callback → GET /api/auth/callback
4. Session has lightspeedUser + tokens → API endpoints accessible
```

### Avatar issues checklist (fixed)
- Ensure `photoUrl` present on `GET /api/auth/session` and `GET /api/users`.
- Backend resolves `photoUrl` using: `image_source` → `photo_url` → `avatar`.
- Frontend `UserAvatar` has `onError` fallback to initials/icon.
- If email-only session occurs, frontend calls `GET /api/auth/user-photo?email=` as enrichment.

### Admin Users shows 0 or "Failed to fetch users"
- Hard refresh the browser to clear stale bundles (Cmd+Shift+R). The UI must use `apiFetch('/api/users')` and read `data.users`.
- Ensure you are authenticated (check `/api/auth/session` in the browser devtools; `GET /api/users` returns 401 if there is no session).
- Verify backend `/api/users` returns a `users` array (combined Lightspeed + augmented rows). If Lightspeed fails, backend will return only local rows; Admin should still render them.
- After clicking "Sync Users", the UI must re-fetch `/api/users` and update the grid.

## Session Management

### Session Types

1. **Lightspeed Session** (`req.session.lightspeedUser`)
   - Created after OAuth2 authentication
   - Includes access tokens for Lightspeed API calls
   - Required for customer/sales endpoints

2. **Selected User Session** (`req.session.selectedUser`)
   - Created when selecting from active users
   - Uses persistent tokens from database
   - Sufficient for most API endpoints

3. **Multi-User Session** (`req.session.userSessions`)
   - Legacy support for user switching
   - Being phased out in favor of selected user

### Session Persistence

- Sessions are stored in cookies (`connect.sid`)
- Cookie file: `cookies.txt` (for curl/script usage)
- Session timeout: Configured in session settings

## Environment Variables

### Required for Authentication

```env
# Session management
SESSION_SECRET=your-session-secret

# Lightspeed OAuth2 (for production)
LS_DOMAIN=your-domain
LS_CLIENT_ID=your-client-id
LS_CLIENT_SECRET=your-client-secret
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Demo mode (for development)
DEMO=false  # Set to true to enable demo mode
```

## Troubleshooting Steps

### 1. Check Session Status
```bash
curl -b cookies.txt -c cookies.txt http://localhost:3000/api/auth/session
```

### 2. Check Active Users
```bash
curl -b cookies.txt -c cookies.txt http://localhost:3000/api/user-selection/active-users
```

### 3. Clear Session (if needed)
```bash
curl -b cookies.txt -c cookies.txt http://localhost:3000/api/auth/clear-session
```

### 4. Check Server Logs
```bash
docker-compose logs backend
```

## Common Error Codes

- `AUTH_REQUIRED`: No valid session found
- `LS_AUTH_REQUIRED`: Lightspeed authentication needed
- `LS_AUTH_EXPIRED`: Lightspeed tokens expired
- `SESSION_MISSING`: Session cookie missing

## Development vs Production

### Development
- Use development authentication for quick testing
- Run `node quick-fix-auth.js` to authenticate
- Uses personal access token for Lightspeed API access
- No OAuth flow required for development

### Production
- Use Lightspeed OAuth2 authentication
- Requires valid Lightspeed credentials
- All endpoints require proper authentication

## Security Notes

- Never commit `.env` files with real credentials
- Use different session secrets for different environments
- Regularly rotate Lightspeed tokens
- Monitor session activity for security issues 