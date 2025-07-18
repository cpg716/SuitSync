# Environment Variables Documentation

This document provides a comprehensive list of all environment variables used in SuitSync, their purposes, and configuration guidelines.

## Required Environment Variables

### Lightspeed API Configuration
```bash
# Your Lightspeed store domain (without .retail.lightspeed.app)
LS_DOMAIN="your-store-name"

# OAuth 2.0 credentials from your Lightspeed app
LS_CLIENT_ID="your_lightspeed_client_id"
LS_CLIENT_SECRET="your_lightspeed_client_secret"

# OAuth callback URL (must match your Lightspeed app configuration)
LS_REDIRECT_URI="http://localhost:3000/api/auth/callback"

# Personal Access Token for system-level operations
LS_PERSONAL_ACCESS_TOKEN="your_lightspeed_personal_access_token"
```

### Application Configuration
```bash
# Strong random string for session encryption (min 32 characters)
SESSION_SECRET="your_very_long_and_random_session_secret_here"

# Database connection string
# Development (SQLite)
DATABASE_URL="file:./backend/prisma/dev.db"
# Production (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/suitsync"

# Frontend URL for CORS and redirects
FRONTEND_URL="http://localhost:3001"

# Backend API URL for frontend
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Server port (default: 3000)
PORT=3000

# Node environment
NODE_ENV="development"

# Redis connection string (default: redis://redis:6379)
REDIS_URL="redis://redis:6379"

# CORS origin (default: http://localhost:3001)
CORS_ORIGIN="http://localhost:3001"
```

## Optional Environment Variables

### Notification Services
```bash
# SendGrid for email notifications
SENDGRID_API_KEY="your_sendgrid_api_key"
SENDGRID_FROM="notifications@yourdomain.com"

# Twilio for SMS notifications
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+15551234567"
```

### Security & Monitoring
```bash
# JWT secret for token signing (if different from SESSION_SECRET)
JWT_SECRET="your_jwt_secret"

# Sentry for error tracking
SENTRY_DSN="your_sentry_dsn"

# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100           # requests per window
```

### Development & Testing
```bash
# Enable debug logging
DEBUG="suitsync:*"

# Disable SSL verification (development only)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Test database URL
TEST_DATABASE_URL="file:./backend/prisma/test.db"
```

## Environment-Specific Configurations

### Development (.env.local)
```bash
NODE_ENV=development
DATABASE_URL="file:./backend/prisma/dev.db"
FRONTEND_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
LS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
REDIS_URL="redis://redis:6379"
CORS_ORIGIN="http://localhost:3001"
```

### Production (.env.production)
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@db:5432/suitsync"
FRONTEND_URL="https://yourdomain.com"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com/api"
LS_REDIRECT_URI="https://api.yourdomain.com/api/auth/callback"
REDIS_URL="redis://redis:6379"
CORS_ORIGIN="https://yourdomain.com"
```

### Docker Development (.env.docker)
```bash
NODE_ENV=development
DATABASE_URL="postgresql://suitsync:supersecret@postgres:5432/suitsync"
FRONTEND_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
REDIS_URL="redis://redis:6379"
CORS_ORIGIN="http://localhost:3001"
```

## Security Guidelines

1. **Never commit .env files** to version control
2. **Use strong, unique secrets** for SESSION_SECRET and JWT_SECRET
3. **Rotate secrets regularly** in production
4. **Use environment-specific values** for URLs and credentials
5. **Validate required variables** at application startup

## Validation

The backend uses Zod schemas to validate environment variables at startup. Missing or invalid variables will cause the application to exit with detailed error messages.

## Troubleshooting

### Common Issues

**"SESSION_SECRET is required"**
- Ensure SESSION_SECRET is set and at least 32 characters long

**"Invalid DATABASE_URL"**
- Check database connection string format
- Ensure database server is running and accessible

**"Lightspeed authentication failed"**
- Verify LS_CLIENT_ID and LS_CLIENT_SECRET are correct
- Check LS_REDIRECT_URI matches your Lightspeed app configuration
- Ensure LS_DOMAIN is correct (without .retail.lightspeed.app)

**"CORS errors in frontend"**
- Verify FRONTEND_URL matches your frontend domain
- Check NEXT_PUBLIC_API_URL is accessible from the browser

For more troubleshooting help, see the main [README.md](../README.md) and [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md).

## Session, Cookie, and CORS
- Session cookies are `secure: false` in dev, `secure: true` in production.
- CORS allows credentials and uses `CORS_ORIGIN`.
- Frontend API client must send `credentials: 'include'` on all requests.

## Health Checks
- Use the backend dashboard at `/` or `/api/admin/dashboard(.json)` for live health/status.

## Environment Setup

## Required Environment Variables
- `DATABASE_URL`: Postgres connection string
- `LS_DOMAIN`, `LS_CLIENT_ID`, `LS_CLIENT_SECRET`, `LS_REDIRECT_URI`: Lightspeed OAuth2 credentials
- `SESSION_SECRET`: Session encryption key
- `CORS_ORIGIN`: Allowed frontend origin (e.g., http://localhost:3001)
- `REDIS_URL`: Redis connection string (if used)

## Notes
- All variables are cross-platform (Mac/Windows/Linux)
- Use `.env` file in project root
- No hardcoded OS-specific paths
- Docker Compose automatically loads environment variables

## Windows
- All scripts and Docker commands work on Windows with Docker Desktop
- If you see path or permission errors, check Docker Desktop settings
