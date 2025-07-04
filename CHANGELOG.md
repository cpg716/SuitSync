# Changelog

All notable changes to SuitSync will be documented in this file.

## [2.0.0] - 2024-01-XX

### 🚀 Major Features
- **Fixed Lightspeed X-Series Integration** - Complete overhaul of API integration
  - Corrected OAuth URLs to use `cloud.lightspeedapp.com`
  - Fixed token exchange endpoint
  - Updated API base URL to use Account ID structure
  - Added proper scope handling

### 🛠️ Improvements
- **Enhanced Session Management**
  - Added session size monitoring and cleanup
  - Prevents 431 "Request Header Fields Too Large" errors
  - Automatic session data optimization
  
- **Circuit Breaker Pattern**
  - Added circuit breaker for Lightspeed API calls
  - Prevents cascading failures during API outages
  - Configurable failure thresholds and timeouts

- **Database Error Handling**
  - Proper Prisma error handling with meaningful messages
  - Standardized error responses across all endpoints
  - Better debugging information in development

- **Frontend Stability**
  - Fixed infinite redirect loops on authentication errors
  - Improved error handling in API client
  - Better session expiration handling

### 🔧 Technical Changes
- Updated environment variable validation
- Added comprehensive logging for debugging
- Improved Docker configuration
- Enhanced security middleware

### 📚 Documentation
- Updated README with v2.0 features
- Created comprehensive deployment guide
- Enhanced API documentation
- Added troubleshooting guides

### 🐛 Bug Fixes
- Fixed OAuth redirect URLs for Lightspeed X-Series
- Resolved session size issues causing 431 errors
- Fixed database connection issues in Docker
- Corrected API client redirect loops

## [1.0.0] - 2024-01-XX

### Initial Release
- Full-stack retail management system
- Lightspeed integration (legacy implementation)
- QR-based alteration tracking
- Party and appointment management
- User role management
- Comprehensive testing suite
- Docker deployment setup

## [Unreleased] - 2025-07-03

### Added
- backend/entrypoint.sh
- backend/src/controllers/checklistsController.ts
- backend/src/controllers/tasksController.ts
- backend/src/routes/checklists.ts
- backend/src/routes/lightspeedSync.ts
- backend/src/routes/tasks.ts
- backend/src/services/lightspeedCustomFieldsService.ts
- backend/src/types/express-session.d.ts
- check_tables.js
- frontend/components/ui/AppointmentForm.tsx
- frontend/components/ui/ChecklistCard.tsx
- frontend/components/ui/CustomerSearchSimple.tsx
- frontend/components/ui/TaskCard.tsx
- frontend/pages/checklists.tsx
- frontend/pages/tasks.tsx
- test_routes.js
- test_routes_fixed.js

### Deleted
- backend/prisma/migrations/20250701155334_enhanced_appointment_workflow/migration.sql
- frontend/pages/dashboard.tsx

### Changed
- .DS_Store
- backend/Dockerfile
- backend/package-lock.json
- backend/package.json
- backend/prisma/schema.prisma
- backend/src/controllers/appointmentsController.ts
- backend/src/controllers/lightspeedAuthController.ts
- backend/src/controllers/lightspeedController.ts
- backend/src/controllers/syncController.ts
- backend/src/controllers/userSwitchController.ts
- backend/src/index.ts
- backend/src/lightspeedClient.ts
- backend/src/middleware/auth.ts
- backend/src/middleware/security.ts
- backend/src/routes/alterations.ts
- backend/src/routes/customers.ts
- backend/src/routes/initRoutes.ts
- backend/src/routes/lightspeed.ts
- backend/src/routes/sync.ts
- backend/src/services/appointmentWorkflowService.ts
- backend/src/services/multiUserSessionService.ts
- backend/src/services/notificationSchedulingService.ts
- backend/src/services/scheduledJobService.ts
- backend/src/services/syncService.ts
- docker-compose.yml
- frontend/.DS_Store
- frontend/README.md
- frontend/components/Layout.tsx
- frontend/components/README.md
- frontend/components/ResourceSyncStatus.tsx
- frontend/components/ui/Appbar.tsx
- frontend/components/ui/CustomerSearch.tsx
- frontend/components/ui/README.md
- frontend/components/ui/SplashScreen.tsx
- frontend/components/ui/SwitchUserModal.tsx
- frontend/components/ui/Tabs.tsx
- frontend/pages/UserSettings.tsx
- frontend/pages/admin.tsx
- frontend/pages/admin/notification-settings.tsx
- frontend/pages/alterations.tsx
- frontend/pages/create-appointment.tsx
- frontend/pages/lightspeed-account.tsx
- frontend/pages/login.tsx
- frontend/pages/monitoring.tsx
- frontend/pages/profile.tsx
- frontend/pages/settings.tsx
- frontend/pages/setup-pin.tsx
- frontend/pages/status.tsx
- frontend/src/AuthContext.tsx

### Summary
- Fixed: Prevented SyncStatusPanel crash on undefined syncStatus (admin panel)
- Verified and ensured all logo/image usages use correct aspect ratio handling to suppress warnings
- Added new checklist and task management backend/frontend modules
- Refactored and improved various backend and frontend files
- Deleted obsolete dashboard and migration files