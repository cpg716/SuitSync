# Authentication System Documentation

## Overview

The SuitSync authentication system follows Lightspeed X-Series API rules while providing a smooth user experience across devices. It supports both **mobile/individual authentication** and **PC/multi-user authentication** with persistent sessions.

## 🔐 **Authentication Flow**

### **1. Initial Authentication (OAuth 2.0)**

Users authenticate once with Lightspeed using OAuth 2.0:

```
User → Lightspeed OAuth → SuitSync → Persistent Session Created
```

**Steps:**
1. User visits `/api/auth/start` (alias supported: `/api/auth/start-lightspeed`)
2. Redirected to Lightspeed login
3. User authorizes SuitSync
4. OAuth callback creates persistent session
5. User redirected to dashboard

### **2. Persistent Sessions**

Once authenticated, users have persistent sessions that work across:
- ✅ **Mobile devices** (automatic login)
- ✅ **PC browsers** (automatic login)
- ✅ **Multiple devices** (same user, different devices)
- ✅ **Session expiry** (30-day automatic cleanup)

### **3. User Selection (PC Version)**

For PC installations, users must select who they are before making changes:

```
PC User → Select User → Make Changes → Audit Trail
```

## 🏗️ **System Architecture**

### **Database Models**

> **Note on Field Naming:** 
> - `lightspeedEmployeeId` in the `User` model stores the Lightspeed employee ID
> - `lightspeedUserId` in the `UserSession` model stores the same Lightspeed employee ID
> - This naming convention exists for historical reasons and both fields contain the same value

#### **UserSession Model**
```prisma
model UserSession {
  id                    String   @id @default(cuid())
  userId                Int      // Required link to local User
  lightspeedUserId      String   // Lightspeed employee ID (same as User.lightspeedEmployeeId)
  browserSessionId      String   // Required for browser sessions
  lsAccessToken         String   @db.Text
  lsRefreshToken        String   @db.Text
  lsDomainPrefix        String
  expiresAt             DateTime
  lastActive            DateTime @default(now())
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  user                  User     @relation("UserSessions", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, browserSessionId])
  @@index([browserSessionId])
  @@index([userId])
  @@index([lightspeedUserId])
  @@index([expiresAt])
  @@index([lastActive])
}
```

#### **ApiToken Model**
```prisma
model ApiToken {
  id          Int      @id @default(autoincrement())
  service     String   @unique
  accessToken String   @db.Text
  refreshToken String  @db.Text
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### **Services**

#### **PersistentUserSessionService**
- Manages persistent user sessions
- Handles session creation, updates, and cleanup
- Provides user selection functionality

#### **Sync Service**
- Uses persistent tokens for API calls
- Handles token refresh automatically
- Works without user session authentication

## 📱 **Mobile Authentication**

### **Flow:**
1. **First Time:** User completes OAuth flow
2. **Subsequent Visits:** Automatic login via persistent session
3. **Token Refresh:** Automatic in background
4. **Session Expiry:** 30-day automatic cleanup

### **Features:**
- ✅ **One-time setup** - OAuth only once
- ✅ **Automatic login** - No repeated authentication
- ✅ **Cross-device sync** - Same user on multiple devices
- ✅ **Secure tokens** - Stored in database, not browser

## 💻 **PC Authentication**

### **Flow:**
1. **First Time:** User completes OAuth flow
2. **Daily Use:** User selects their identity before making changes
3. **Audit Trail:** All changes tracked with user attribution
4. **Multi-user Support:** Multiple users can use same PC

### **User Selection Process:**
```
1. User opens SuitSync on PC
2. System shows list of active users
3. User selects their identity
4. User can now make changes (all tracked)
5. User can switch to different identity
```

### **API Endpoints:**

#### **Get Active Users**
```http
GET /api/user-selection/active-users
```
Returns list of all active user sessions for selection.

#### **Select User**
```http
POST /api/user-selection/select-user
Content-Type: application/json

{
  "lightspeedUserId": "12345"
}
```

#### **Get Selected User**
```http
GET /api/user-selection/selected-user
```

#### **Clear Selection**
```http
POST /api/user-selection/clear-selection
```

#### **Deactivate User**
```http
DELETE /api/user-selection/deactivate/:lightspeedUserId
```

## 🔄 **Sync System Integration**

### **Persistent Token Usage**
The sync system uses persistent tokens stored in the `ApiToken` table:

```typescript
// Sync service automatically uses persistent tokens
const syncCustomers = async (req: any) => {
  const token = await getPersistentLightspeedToken();
  // Use token for API calls
};
```

### **Authentication Bypass**
Sync endpoints bypass user authentication:

```typescript
// Special bypass for sync endpoints
if (req.originalUrl.startsWith('/api/sync/')) {
  return next(); // Allow access with persistent tokens
}
```

## 📊 **Audit Trail**

### **User Attribution**
All changes are tracked with user attribution:

```typescript
// Example audit log entry
{
  userId: "12345",
  action: "create",
  entity: "Customer",
  entityId: 67890,
  details: {
    customerName: "John Doe",
    selectedUser: "Jane Smith"
  }
}
```

### **User Selection Tracking**
User selections are logged for audit:

```typescript
// User selection audit
{
  action: "user_selected",
  entity: "UserSession",
  entityId: "12345",
  details: {
    selectedUser: "Jane Smith",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0..."
  }
}
```

## 🔧 **Configuration**

### **Environment Variables**
```env
# Lightspeed OAuth
LS_CLIENT_ID=your_client_id
LS_CLIENT_SECRET=your_client_secret
LS_DOMAIN=your_domain
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Session Management
SESSION_SECRET=your_session_secret
REDIS_URL=redis://redis:6379
```

### **Session Configuration**
```typescript
// Session settings
{
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}
```

## 🚀 **Deployment Considerations**

### **Production Setup**
1. **HTTPS Required:** OAuth requires HTTPS in production
2. **Domain Configuration:** Update `LS_REDIRECT_URI` for production domain
3. **Redis Persistence:** Configure Redis for session persistence
4. **Database Backups:** Regular backups of `UserSession` and `ApiToken` tables

### **Security Features**
- ✅ **OAuth 2.0** - Industry standard authentication
- ✅ **Token Refresh** - Automatic token renewal
- ✅ **Session Expiry** - Automatic cleanup of old sessions
- ✅ **Audit Logging** - Complete change tracking
- ✅ **User Attribution** - All changes linked to users

## 📋 **User Experience**

### **Mobile Users**
- **First Time:** Complete OAuth (5 minutes)
- **Daily Use:** Automatic login (instant)
- **No Re-authentication:** Works for 30 days

### **PC Users**
- **First Time:** Complete OAuth (5 minutes)
- **Daily Use:** Select user identity (30 seconds)
- **Multi-user:** Switch between users easily
- **Audit Trail:** All changes tracked

### **Administrators**
- **User Management:** View all active sessions
- **Session Control:** Deactivate users remotely
- **Audit Reports:** Complete change history
- **Security Monitoring:** Track user activity

## 🔍 **Troubleshooting**

### **Common Issues**

#### **"Authentication Required" Error**
- **Cause:** No valid session or selected user
- **Solution:** Complete OAuth flow or select user

#### **"Token Expired" Error**
- **Cause:** Access token expired
- **Solution:** System automatically refreshes tokens

#### **"User Not Found" Error**
- **Cause:** User session deactivated
- **Solution:** Re-authenticate with Lightspeed

### **Debug Endpoints**
```http
GET /api/auth/session-debug
GET /api/user-selection/active-users
GET /api/user-selection/selected-user
```

## 📚 **API Reference**

### **Authentication Endpoints**
- `GET /api/auth/start` - Start OAuth flow (alias: `/api/auth/start-lightspeed`)
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/session-debug` - Debug session state

### **User Selection Endpoints**
- `GET /api/user-selection/active-users` - Get active users
- `POST /api/user-selection/select-user` - Select user
- `GET /api/user-selection/selected-user` - Get selected user
- `POST /api/user-selection/clear-selection` - Clear selection
- `DELETE /api/user-selection/deactivate/:id` - Deactivate user

### **Sync Endpoints**
- `POST /api/sync/customers` - Sync customers
- `POST /api/sync/products` - Sync products
- `GET /api/sync/status` - Get sync status

## 🎯 **Best Practices**

### **For Users**
1. **Complete OAuth once** - No need to re-authenticate
2. **Select identity on PC** - Always select before making changes
3. **Logout when done** - Deactivate session when finished

### **For Administrators**
1. **Monitor active sessions** - Regular review of active users
2. **Review audit logs** - Check for unusual activity
3. **Clean up old sessions** - Deactivate inactive users

### **For Developers**
1. **Use persistent tokens** - For sync operations
2. **Log user actions** - Always include user attribution
3. **Handle token refresh** - Automatic token management
4. **Validate user selection** - Ensure user is selected before changes

## 🔮 **Future Enhancements**

### **Planned Features**
- **Biometric Authentication** - Fingerprint/Face ID support
- **Multi-factor Authentication** - SMS/Email verification
- **Role-based Access Control** - Granular permissions
- **Session Analytics** - Usage tracking and reporting
- **Offline Support** - Work without internet connection

### **Integration Opportunities**
- **Active Directory** - Windows domain integration
- **Single Sign-On** - Enterprise SSO support
- **Mobile Device Management** - MDM integration
- **Security Information and Event Management** - SIEM integration 