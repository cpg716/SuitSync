# SuitSync Authentication Fix

## Issue Summary

The "Authentication Failed at Login" error was caused by a mismatch between the authentication implementation and SuitSync's design. SuitSync is designed to use **Lightspeed OAuth only**, but the authentication middleware was incorrectly looking for JWT tokens instead of session-based authentication.

## Root Cause

1. **Authentication Middleware Mismatch**: The `authMiddleware` was looking for JWT tokens in cookies/headers, but Lightspeed OAuth uses session-based authentication
2. **JWT Secret Mismatch**: There was inconsistency between `JWT_SECRET` and `SESSION_SECRET` environment variables
3. **Local Login Confusion**: The presence of local login functionality was misleading since SuitSync should only use Lightspeed OAuth
4. **Demo Users**: The seed file was creating demo users with local passwords, which shouldn't exist in a Lightspeed-only system

## Changes Made

### 1. Fixed Authentication Middleware (`backend/src/middleware/auth.ts`)

**Before**: Only checked for JWT tokens
```typescript
let token = req.cookies.token;
const decoded = jwt.verify(token, secret);
```

**After**: Prioritizes session-based authentication (Lightspeed OAuth)
```typescript
// Check for session-based authentication (Lightspeed OAuth)
if (req.session?.userId) {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId }
  });
  // ... handle session auth
}

// Fallback: Check for JWT token (for API access)
if (token) {
  // ... handle JWT auth
}
```

### 2. Updated Auth Controller (`backend/src/controllers/authController.ts`)

- **Removed local login functionality**: Now returns error directing users to Lightspeed OAuth
- **Enhanced session handling**: Better error messages and redirect URLs
- **Cleaned up imports**: Removed unused JWT and bcrypt imports

### 3. Fixed Session Types (`backend/src/types/express-session/index.d.ts`)

Added missing session properties:
```typescript
interface SessionData {
  userId?: number;
  lsAccessToken?: string;
  lsRefreshToken?: string;
  lsDomainPrefix?: string;
  lsAuthState?: string;
  lastLightspeedSync?: string;
}
```

### 4. Updated Seed File (`backend/src/seed.ts`)

- **Removed demo users**: No longer creates users with local passwords
- **Demo data only**: Creates customers, parties, and alteration jobs without user assignments
- **Clear messaging**: Explains that users are created via Lightspeed OAuth

## How Authentication Now Works

### 1. User Flow
1. User visits `/login` page
2. Clicks "Sign in with Lightspeed" button
3. Frontend redirects to `/api/auth/start-lightspeed`
4. Backend redirects to Lightspeed OAuth authorization page
5. User authorizes the application in Lightspeed
6. Lightspeed redirects back to `/api/auth/callback`
7. Backend exchanges authorization code for access tokens
8. Backend creates/updates user in database from Lightspeed user data
9. Backend stores tokens and user ID in session
10. User is redirected to frontend dashboard

### 2. Session-Based Authentication
- **Primary method**: Session contains `userId` and Lightspeed tokens
- **Middleware check**: `req.session?.userId` indicates authenticated user
- **Token storage**: Lightspeed access/refresh tokens stored in session
- **User data**: Fetched from database using session `userId`

### 3. JWT Fallback
- **API access**: JWT tokens can still be used for API-only access
- **Backward compatibility**: Existing API integrations continue to work
- **Token generation**: Can be created for service-to-service communication

## Environment Variables Required

All required environment variables are properly configured:

```bash
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret  
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback
LS_DOMAIN=your_lightspeed_domain_prefix
FRONTEND_URL=http://localhost:3001
SESSION_SECRET=your_random_session_secret
DATABASE_URL=postgresql://username:password@localhost:5432/suitsync
```

## Testing the Fix

### 1. Start the Application
```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

### 2. Test Authentication Flow
1. Navigate to `http://localhost:3001/login`
2. Click "Sign in with Lightspeed"
3. Complete Lightspeed OAuth flow
4. Verify successful login and redirect to dashboard

### 3. Verify Session
- Check that `/api/auth/session` returns user data
- Verify Lightspeed connection status is shown
- Confirm access to protected routes

## Key Benefits

1. **Proper OAuth Flow**: Now correctly implements Lightspeed OAuth 2.0
2. **Session Security**: Secure session-based authentication with encrypted cookies
3. **No Local Passwords**: Eliminates security risk of local password storage
4. **Lightspeed Integration**: Full integration with Lightspeed user roles and permissions
5. **Clear Error Messages**: Better user experience with helpful error messages

## Troubleshooting

### Common Issues

1. **"No token provided"**: Ensure you're using session-based auth, not trying to login locally
2. **"User not found"**: User will be created automatically on first Lightspeed login
3. **OAuth errors**: Check Lightspeed app configuration and redirect URI
4. **Session issues**: Verify `SESSION_SECRET` is set and database is accessible

### Debug Tools

Run the configuration checker:
```bash
cd backend
node debug_lightspeed_config.js
```

This will verify all environment variables and provide helpful setup information.

## Next Steps

1. **Remove debug files**: Delete `debug_lightspeed_config.js` when no longer needed
2. **Test with real users**: Have team members test the Lightspeed OAuth flow
3. **Monitor sessions**: Check session storage and cleanup in production
4. **Update documentation**: Ensure all team members understand the OAuth-only approach

The authentication system now properly implements Lightspeed OAuth as the sole authentication method, providing secure and seamless integration with the Lightspeed X-Series platform.
