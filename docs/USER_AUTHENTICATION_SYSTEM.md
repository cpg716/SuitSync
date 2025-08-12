# User Authentication & Access System

## Overview

SuitSync now supports a dual authentication system that allows both Lightspeed OAuth and local email/password authentication, with proper user role management and access control.

## User Types & Access Levels

### 1. Admin Users
- **Authentication**: Lightspeed OAuth required
- **Access**: Full system access, can manage all users and settings
- **Features**: 
  - Lightspeed data synchronization
  - User management
  - System configuration
  - All CRUD operations

### 2. Sales Users
- **Authentication**: Local email/password OR Lightspeed OAuth
- **Access**: Sales-related features and customer management
- **Features**:
  - Party management
  - Appointment scheduling
  - Customer data access
  - Commission tracking

### 3. Sales Management Users
- **Authentication**: Local email/password OR Lightspeed OAuth
- **Access**: Sales management features plus team oversight
- **Features**:
  - All Sales features
  - Team performance monitoring
  - Commission management
  - Sales reporting

### 4. Tailors
- **Authentication**: No login required (QR code workflow only)
- **Access**: QR code scanning and alteration status updates
- **Features**:
  - QR code scanning
  - Alteration status updates
  - Work progress tracking

## Database Schema Changes

### User Model Updates
```sql
-- New fields added to User table
ALTER TABLE "User" ADD COLUMN "canLoginToSuitSync" BOOLEAN DEFAULT true;
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
```

### Tailor Selection Persistence
```sql
-- New table for storing tailor selections
CREATE TABLE "TailorSelectionSession" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" TEXT UNIQUE NOT NULL,
  "selectedTailorId" INTEGER NOT NULL,
  "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deviceInfo" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("selectedTailorId") REFERENCES "User"("id")
);
```

## Authentication Flow

### 1. Login Page
- **Dual Authentication Toggle**: Users can choose between Lightspeed OAuth and local login
- **Local Login Form**: Email/password fields with validation
- **Lightspeed OAuth**: Redirects to Lightspeed authorization

### 2. Session Management
- **Local Sessions**: Stored in database with user ID and authentication status
- **Lightspeed Sessions**: OAuth tokens with automatic refresh
- **Session Persistence**: Both types persist across browser sessions

### 3. Access Control
- **Role-based Permissions**: Different features available based on user role
- **Authentication Requirements**: Some endpoints require specific authentication types
- **Session Validation**: Automatic session checking and refresh

## API Endpoints

### Authentication
- `POST /api/auth/login` - Local email/password authentication
- `GET /api/auth/start` - Start Lightspeed OAuth flow (alias maintained: `/api/auth/start-lightspeed`)
- `GET /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout user

### Tailor Selection
- `GET /api/tailor-selection/available` - Get available tailors
- `POST /api/tailor-selection/save` - Save tailor selection
- `GET /api/tailor-selection/last/:sessionId` - Get last selected tailor
- `DELETE /api/tailor-selection/clear/:sessionId` - Clear selection
- `GET /api/tailor-selection/sessions` - List active sessions (Admin)

### User Management
- `GET /api/users` - List all users
- `PUT /api/users/:id` - Update user
- `POST /api/users` - Create user (Admin only)

## Frontend Components

### 1. Login Page (`/pages/login.tsx`)
- **Authentication Toggle**: Switch between Lightspeed OAuth and local login
- **Form Validation**: Email/password validation for local login
- **Error Handling**: Comprehensive error messages and user feedback

### 2. Tailor Selection Modal (`/components/TailorSelectionModal.tsx`)
- **Tailor List**: Display available tailors with photos and names
- **Selection Persistence**: Remember user's last selection
- **Session Management**: Device-specific session tracking

### 3. QR Code Scanner (`/pages/alterations-scan.tsx`)
- **Tailor Integration**: Require tailor selection before scanning
- **Status Updates**: Track which tailor performed work
- **Session Persistence**: Remember tailor selection across scans

## User Avatar Display

### Implementation Status
- **User Selection Menu**: ✅ Avatars displayed in user selection
- **Logged-in User Display**: ✅ Avatars shown in header and profile
- **Tailor Selection**: ✅ Avatars in tailor selection modal
- **QR Code Workflow**: ✅ Tailor avatars in scanning interface

### How it works (fixed)
- **Single source of truth**: All users are Lightspeed identities. Local DB holds augmentation fields (e.g., `commissionRate`, availability, skills), not separate account types.
- **Photo resolution order** (any available): `image_source` → `photo_url` → `avatar` → fallback.
  - Applied at login in `backend/src/controllers/lightspeedAuthController.ts` when building `req.session.lightspeedUser`.
  - Enforced in session response in `backend/src/controllers/authController.ts#getSession`.
  - Enforced when listing users in `backend/src/controllers/usersController.ts#getUsers` (hybrid list merges Lightspeed data + local augmentation).
- **Frontend rendering**: `frontend/components/ui/UserAvatar.tsx` uses the `photoUrl` and falls back to initials or icon if the image fails to load (`onError` handler toggles fallback state).

### Endpoints involved
- `GET /api/auth/session`: returns the current Lightspeed user with resolved `photoUrl`.
- `GET /api/users`: returns merged users with resolved `photoUrl` for each entry.
- `GET /api/auth/user-photo?email=`: optional enrichment endpoint if a session lacks a `photoUrl` (used defensively by `AuthContext`).

### Test checklist
1. Login via Lightspeed → header avatar displays (Appbar).
2. Open Users modal/list → each user shows resolved avatar if Lightspeed provides one.
3. Break an image URL (network devtools) → Avatar component falls back to initials icon automatically.
4. Verify API responses include `photoUrl`:
   - `curl -b cookies.txt http://localhost:3000/api/auth/session`
   - `curl -b cookies.txt http://localhost:3000/api/users`

## Commission Tracking

### Sales Commission Rate
- **Field**: `commissionRate` in User model (default: 0.1 = 10%)
- **Access**: Sales and Sales Management users
- **Tracking**: Automatic commission calculation on sales
- **Reporting**: Commission leaderboards and reports

### Implementation Status
- **Database Schema**: ✅ Commission rate field added
- **User Management**: ✅ Admins can set commission rates
- **Sales Tracking**: ✅ Commission tracking in sales workflow
- **Reporting**: ✅ Commission leaderboards available

## Security Features

### 1. Password Security
- **Hashing**: bcrypt with salt rounds
- **Validation**: Strong password requirements
- **Storage**: Secure password hash storage

### 2. Session Security
- **Secure Cookies**: HttpOnly, Secure, SameSite attributes
- **Session Expiration**: Configurable session timeouts
- **CSRF Protection**: Built-in CSRF protection

### 3. Access Control
- **Role-based Authorization**: Different permissions per role
- **Endpoint Protection**: Authentication required for sensitive endpoints
- **Data Isolation**: Users can only access appropriate data

## Configuration

### Environment Variables
```env
# Authentication
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# Lightspeed OAuth
LS_CLIENT_ID=your-lightspeed-client-id
LS_CLIENT_SECRET=your-lightspeed-client-secret
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/suitsync
```

### User Setup
1. **Admin Users**: Must be created via Lightspeed OAuth
2. **Local Users**: Can be created by admins with email/password
3. **Tailors**: No login required, only QR code access

## Migration Guide

### From Previous Version
1. **Database Migration**: Run new migrations for user fields
2. **User Data**: Existing users will have default values
3. **Authentication**: Update login page to support both methods
4. **Tailor Workflow**: Implement tailor selection in QR scanning

### User Management
1. **Admin Setup**: First admin must use Lightspeed OAuth
2. **Local Users**: Admins can create local users via admin panel
3. **Role Assignment**: Set appropriate roles and permissions
4. **Commission Rates**: Configure commission rates for sales users

## Troubleshooting

### Common Issues
1. **Session Expired**: Clear browser cookies and re-authenticate
2. **Tailor Selection Lost**: Check localStorage and session persistence
3. **Avatar Not Loading**: Verify photo URL and fallback handling
4. **Commission Not Tracking**: Check user role and commission rate settings

### Debug Tools
- **Session Debug**: `/api/auth/session-debug` endpoint
- **User Status**: Check user authentication status in browser dev tools
- **Database Logs**: Monitor user session and authentication logs

## Future Enhancements

### Planned Features
1. **Multi-factor Authentication**: SMS/email verification for local users
2. **Password Reset**: Self-service password reset functionality
3. **User Groups**: Group-based permissions and access control
4. **Audit Logging**: Comprehensive user action logging
5. **API Rate Limiting**: Enhanced rate limiting for authentication endpoints

### Integration Opportunities
1. **SSO Integration**: Single Sign-On with external providers
2. **Active Directory**: LDAP/Active Directory integration
3. **Biometric Authentication**: Fingerprint/face recognition for mobile
4. **Hardware Tokens**: Physical security key support 