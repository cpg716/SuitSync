# SuitSync Authentication Setup Guide

## Overview

SuitSync uses **Lightspeed X-Series OAuth 2.0** as the primary authentication method. This ensures that all users are authenticated through their existing Lightspeed accounts, maintaining security and role consistency.

## Authentication Methods

### 1. Production Authentication (Lightspeed OAuth)

In production, SuitSync exclusively uses Lightspeed OAuth 2.0:

- **Users must have a Lightspeed X-Series account**
- **No local passwords or accounts**
- **Roles and permissions sync from Lightspeed**
- **Secure token-based session management**

#### OAuth Flow:
1. User clicks "Sign in with Lightspeed"
2. Redirected to Lightspeed authorization server
3. User authenticates with Lightspeed credentials
4. Lightspeed redirects back with authorization code
5. SuitSync exchanges code for access/refresh tokens
6. User profile fetched from Lightspeed API
7. Local user record created/updated
8. Session established with user ID

### 2. Development Authentication (Demo Users)

For development and testing, SuitSync provides a bypass mechanism:

- **Only available when `NODE_ENV=development`**
- **Uses pre-seeded demo users with mock Lightspeed IDs**
- **Simulates successful Lightspeed OAuth flow**
- **Allows testing without real Lightspeed credentials**

#### Available Demo Users:
- `admin@demo.com` - Admin User (role: admin)
- `sales1@demo.com` - Sales Associate 1 (role: associate)
- `tailor1@demo.com` - Tailor 1 (role: tailor)
- `sales2@demo.com` - Sales Associate 2 (role: associate)
- `tailor2@demo.com` - Tailor 2 (role: tailor)
- `tailor3@demo.com` - Tailor 3 (role: tailor)
- `support1@demo.com` - Support Staff 1 (role: support)
- `support2@demo.com` - Support Staff 2 (role: support)

## Configuration

### Environment Variables

```bash
# Lightspeed OAuth Configuration
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback
LS_DOMAIN=your_lightspeed_domain

# Session Management
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

# Application URLs
FRONTEND_URL=http://localhost:3001
APP_URL=http://localhost:3000

# Environment Mode
NODE_ENV=production   # Use 'development' to enable dev login endpoints
```

### Docker Configuration

The `docker-compose.yml` file sets `NODE_ENV=production` for secure production authentication:

```yaml
backend:
  environment:
    NODE_ENV: production  # Disables dev login, Lightspeed OAuth only
```

## API Endpoints

### Production Endpoints

- `GET /api/auth/start-lightspeed` - Initiates Lightspeed OAuth flow
- `GET /api/auth/callback` - Handles Lightspeed OAuth callback
- `GET /api/auth/session` - Returns current user session
- `POST /api/auth/logout` - Destroys user session

### Development Endpoints

- `POST /api/auth/dev-login` - Development-only login (requires `NODE_ENV=development`)

#### Dev Login Request:
```json
POST /api/auth/dev-login
{
  "email": "admin@demo.com"
}
```

#### Dev Login Response:
```json
{
  "message": "Development login successful",
  "user": {
    "id": 217,
    "email": "admin@demo.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

## Frontend Integration

### Login Page

The login page (`frontend/pages/login.tsx`) provides:

1. **Lightspeed OAuth Button** - Always visible, primary authentication method
2. **Development Login Buttons** - Only visible in development mode

### Authentication Context

The `AuthContext` (`frontend/src/AuthContext.tsx`) handles:

- Session state management
- User data fetching
- Authentication status
- Automatic redirects

## Security Considerations

### Production Security

- **OAuth 2.0 with PKCE** - Secure authorization code flow
- **HTTPS Only** - All authentication endpoints require HTTPS
- **Session Cookies** - HttpOnly, Secure, SameSite cookies
- **Token Refresh** - Automatic refresh token handling
- **CSRF Protection** - State parameter validation

### Development Security

- **Environment Restricted** - Dev endpoints only work in development
- **Mock Tokens** - Development uses mock Lightspeed tokens
- **No Real Credentials** - Demo users don't expose real Lightspeed data

## Troubleshooting

### Common Issues

1. **"Authentication Failed at Login"**
   - Check if `NODE_ENV=development` is set for dev mode
   - Verify Lightspeed OAuth credentials for production
   - Ensure demo users have `lightspeedEmployeeId` values

2. **"Session Not Found"**
   - Check session cookie configuration
   - Verify `SESSION_SECRET` is set
   - Ensure cookies are being sent with requests

3. **"Lightspeed Connection Required"**
   - User needs valid Lightspeed session
   - Check if access token is expired
   - Verify Lightspeed API permissions

### Debug Steps

1. **Check Backend Logs**
   ```bash
   docker-compose logs backend --tail=50
   ```

2. **Test Authentication Endpoints**
   ```bash
   # Test dev login
   curl -X POST http://localhost:3000/api/auth/dev-login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@demo.com"}' \
     --cookie-jar cookies.txt

   # Test session
   curl -X GET http://localhost:3000/api/auth/session \
     --cookie cookies.txt
   ```

3. **Verify Database Users**
   ```sql
   SELECT id, email, name, role, "lightspeedEmployeeId" 
   FROM "User" 
   WHERE email LIKE '%@demo.com';
   ```

## Migration from Demo to Production

When moving from development to production:

1. **Set `NODE_ENV=production`** in docker-compose.yml
2. **Configure real Lightspeed OAuth credentials**
3. **Remove or disable demo users** (optional)
4. **Enable HTTPS** for all authentication endpoints
5. **Update redirect URIs** to production domains

## Best Practices

- **Always use Lightspeed OAuth in production**
- **Keep demo users for development/testing only**
- **Regularly rotate session secrets**
- **Monitor authentication logs for security issues**
- **Test OAuth flow with real Lightspeed accounts before deployment**
