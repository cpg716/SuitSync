# SuitSync Authentication Guide

## Overview

SuitSync uses **Lightspeed X-Series OAuth 2.0** as the sole authentication method. All users must authenticate through their Lightspeed accounts, ensuring security and role consistency. Local login and demo users are no longer supported in production.

## Authentication Flow
1. User visits `/login` and clicks "Sign in with Lightspeed"
2. Redirected to Lightspeed OAuth authorization
3. User authenticates with Lightspeed credentials
4. Lightspeed redirects back with an authorization code
5. SuitSync exchanges code for access/refresh tokens
6. User profile is fetched from Lightspeed API
7. Local user record is created/updated (including pinHash)
8. Session is established with user ID and tokens

## Session-Based Authentication
- **Primary method**: Session contains `userId` and Lightspeed tokens
- **Middleware check**: `req.session?.userId` indicates authenticated user
- **Token storage**: Lightspeed access/refresh tokens stored in session
- **User data**: Fetched from database using session `userId`

## Environment Variables Required

```bash
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback
LS_DOMAIN=your_lightspeed_domain_prefix
SESSION_SECRET=your_random_session_secret
DATABASE_URL=postgresql://username:password@localhost:5432/suitsync
```

## Recent Migration: pinHash Column
- The `User` table now includes a `pinHash` column for secure PIN storage.
- If you see errors about missing `pinHash`, run the latest Prisma migration.
- Always run `npm install` and rebuild Docker images after schema changes.

## Backup & Restore
- To create a full backup: `tar -czvf suitsync_full_clean_backup_$(date +%Y%m%d_%H%M%S).tar.gz .`
- Store backups securely and test restores regularly.

## Troubleshooting

### Common Issues
- **"Cannot read properties of null (reading 'id')"**: Run the latest migration to add missing columns.
- **OAuth errors**: Check Lightspeed app configuration and redirect URI.
- **Session issues**: Verify `SESSION_SECRET` is set and database is accessible.

### Debug Tools
- Run `node backend/debug_lightspeed_config.js` to verify environment variables.

## Best Practices
- Always use Lightspeed OAuth in production
- Rotate session secrets regularly
- Monitor authentication logs for security issues
- Test OAuth flow with real Lightspeed accounts before deployment

For more, see [docs/ENVIRONMENT.md](ENVIRONMENT.md) and [README.md](../README.md)
