# SuitSync Installation Types

SuitSync supports three different installation types for your single-location business, each designed for specific use cases within your operation.

## Installation Types Overview

### 1. SuitSync Server
**Main business system** - The central system where all your business data is stored and managed.

**Characteristics:**
- ✅ **Data Storage**: All customers, parties, alterations, appointments stored here
- ✅ **Lightspeed Integration**: Syncs with your Lightspeed store
- ✅ **Multi-User Support**: All your staff can log in and work simultaneously
- ✅ **API Server**: Provides access for other devices in your business
- ✅ **Full Functionality**: Complete feature set with all capabilities

**Use Case:** Your main business computer or server

### 2. SuitSync PC (Windows 11)
**Workstation installation** - For your office computers and workstations.

**Characteristics:**
- 📱 **PWA Installation**: Progressive Web App for Windows 11
- 🔄 **Data Sync**: Connects to your main business server
- 👥 **Multi-User Support**: Staff can switch between different accounts
- ✏️ **Full Editing**: Complete access to all business functions
- 🌐 **Offline Capable**: Works offline with local data caching

**Use Case:** Your office computers, workstations, and point-of-sale terminals

### 3. SuitSync Mobile (iOS/Android)
**Mobile device installation** - For tablets and mobile devices in your business.

**Characteristics:**
- 📱 **PWA Installation**: Progressive Web App for iOS/Android
- 🔄 **Data Sync**: Connects to your main business server
- 👤 **Single User**: One user per device (good for dedicated staff)
- ✏️ **Full Editing**: Complete access to all business functions
- 🌐 **Mobile Optimized**: Perfect for customer interactions and field work

**Use Case:** Your tablets, mobile devices, and customer interaction devices

## Environment Configuration

### Server Installation (.env)
```bash
# Installation Type
SUITSYNC_INSTALL_TYPE=server
SUITSYNC_INSTANCE_ID=main-business-001
SUITSYNC_LOCATION_NAME="Your Business Name"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/suitsync"

# Lightspeed X-Series API (Required for server)
LS_CLIENT_ID="your_lightspeed_client_id"
LS_CLIENT_SECRET="your_lightspeed_client_secret"
LS_REDIRECT_URI="https://your-business.com/api/auth/callback"

# Application
SESSION_SECRET="your_very_long_session_secret_here"
FRONTEND_URL="https://your-business.com"
PORT=3000
NODE_ENV="production"

# Optional Services
SENDGRID_API_KEY="your_sendgrid_key"
SENDGRID_FROM="notifications@yourdomain.com"
```

### PC Installation (.env)
```bash
# Installation Type
SUITSYNC_INSTALL_TYPE=pc
SUITSYNC_INSTANCE_ID=workstation-001
SUITSYNC_LOCATION_NAME="Your Business Name"
SUITSYNC_SERVER_URL="https://your-business.com"

# Database (Local SQLite for caching)
DATABASE_URL="file:./local.db"

# Application
SESSION_SECRET="your_very_long_session_secret_here"
FRONTEND_URL="http://localhost:3001"
PORT=3000
NODE_ENV="production"

# Note: No Lightspeed credentials needed for workstation installations
```

### Mobile Installation (.env)
```bash
# Installation Type
SUITSYNC_INSTALL_TYPE=mobile
SUITSYNC_INSTANCE_ID=tablet-001
SUITSYNC_LOCATION_NAME="Your Business Name"
SUITSYNC_SERVER_URL="https://your-business.com"

# Database (Local SQLite for caching)
DATABASE_URL="file:./local.db"

# Application
SESSION_SECRET="your_very_long_session_secret_here"
FRONTEND_URL="http://localhost:3001"
PORT=3000
NODE_ENV="production"

# Note: No Lightspeed credentials needed for mobile installations
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SuitSync      │    │   SuitSync      │    │   SuitSync      │
│    Server       │    │      PC         │    │    Mobile       │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ PostgreSQL  │ │    │ │   SQLite    │ │    │ │   SQLite    │ │
│ │ Database    │ │    │ │  (Cache)    │ │    │ │  (Cache)    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Lightspeed  │ │    │ │   Server    │ │    │ │   Server    │ │
│ │    API      │ │    │ │ Connection  │ │    │ │ Connection  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ REST API    │ │◄───┤ │   PWA UI    │ │    │ │   PWA UI    │ │
│ │ Endpoints   │ │    │ │             │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Data Flow

### Server Installation
1. **Data Storage**: All data stored in PostgreSQL database
2. **Lightspeed Sync**: Bi-directional sync with Lightspeed X-Series
3. **API Provision**: Provides REST API for client installations
4. **User Management**: Handles multiple user sessions

### Client Installations (PC/Mobile)
1. **Data Fetching**: Pull data from server via REST API
2. **Local Caching**: Store data locally in SQLite for offline access
3. **Data Sync**: Periodically sync with server for updates
4. **User Interface**: PWA interface for data management

## Your Business Setup

### Typical Single-Location Business Setup
```
┌─────────────────┐
│   SuitSync      │
│    Server       │ (Your main business computer)
│                 │
│ ┌─────────────┐ │
│ │ PC Client   │ │ (Office workstations)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ PC Client   │ │ (Point-of-sale terminal)
│ └─────────────┘ │
│                 │
│ ┌─────────────┐ │
│ │ Mobile      │ │ (Tablets for customer service)
│ │ Client      │ │
│ └─────────────┘ │
└─────────────────┘
```

### Simple Setup (Just Main Server)
```
┌─────────────────┐
│   SuitSync      │
│    Server       │ (Your main business computer)
│                 │
└─────────────────┘
```

### Full Setup with Multiple Devices
```
┌─────────────────┐
│   SuitSync      │
│    Server       │ (Main business computer)
│                 │
│ ┌─────────────┐ │
│ │ PC Client   │ │ (Office computer 1)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ PC Client   │ │ (Office computer 2)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ PC Client   │ │ (POS terminal)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Mobile      │ │ (Customer service tablet)
│ │ Client      │ │
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Mobile      │ │ (Field work tablet)
│ │ Client      │ │
│ └─────────────┘ │
└─────────────────┘
```

## Configuration Validation

The system automatically validates configuration based on installation type:

### Server Installation Requirements
- ✅ `SUITSYNC_INSTALL_TYPE=server`
- ✅ `LS_CLIENT_ID` (required)
- ✅ `LS_CLIENT_SECRET` (required)
- ✅ `LS_REDIRECT_URI` (required)
- ✅ `DATABASE_URL` (PostgreSQL recommended)

### Client Installation Requirements
- ✅ `SUITSYNC_INSTALL_TYPE=pc` or `SUITSYNC_INSTALL_TYPE=mobile`
- ✅ `SUITSYNC_SERVER_URL` (required)
- ✅ `DATABASE_URL` (SQLite for local caching)
- ❌ Lightspeed credentials (not needed)

## Security Considerations

### Server Installation
- **Database Security**: Secure PostgreSQL configuration
- **API Security**: Implement proper authentication and authorization
- **Lightspeed Security**: Secure OAuth2 implementation
- **Network Security**: HTTPS, firewall, VPN if needed

### Client Installations
- **Local Data**: Encrypt local SQLite database
- **Network Security**: HTTPS communication with server
- **Authentication**: Session-based authentication
- **Offline Security**: Secure local data when offline

## Troubleshooting

### Common Issues

#### Client Cannot Connect to Server
1. Check `SUITSYNC_SERVER_URL` configuration
2. Verify server is running and accessible
3. Check network connectivity
4. Review server logs for connection attempts

#### Server Lightspeed Sync Issues
1. Verify Lightspeed credentials
2. Check OAuth2 configuration
3. Review API rate limits
4. Check server logs for sync errors

#### Data Sync Problems
1. Check client-server connectivity
2. Verify database permissions
3. Review sync logs
4. Check for data conflicts

### Log Locations
- **Server**: `backend/logs/`
- **Client**: `logs/` (local installation directory)

### Health Checks
- **Server**: `/api/health`
- **Client**: `/api/client/server-status`
- **Installation Info**: `/api/client/installation-info` 