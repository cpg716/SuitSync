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

## [Unreleased] - 2025-07-07

### Added
- Unified sync status in header now lists all resources (customers, users, products, sales) with individual status and last sync time.
- Backend `/api/lightspeed/health` always returns all expected sync resources, even if never synced.
- API health and error info now included in sync status response.
- Windows migration instructions and Docker compatibility notes.

### Avatar & Identity Model
- Avatar pipeline fixed: resolve Lightspeed image fields (`image_source` → `photo_url` → `avatar`) in session and users API; frontend falls back to initials/icon.
- Identity model clarified: all users are Lightspeed identities; local DB augments with availability, commission, skills, and audit only (no standalone local accounts).

### Fixed
- Customer list now sorts by last name (with missing last names at end), displays as `Last Name, First Name`.
- Search by last name, first name, email, or phone now works as expected.
- Removed leading letter/avatar from customer list display.
- SyncStatus table and Prisma schema are now fully in sync; backend always updates correct table.
- Sync status now updates correctly after each sync; no more perpetual 'Idle' or 'Not Synced'.
- Tooltip in header now shows all sync resources, not just customers.
- Backend and frontend restart scripts improved for cross-platform compatibility.

### Changed
- Backend and frontend code refactored for robust sync status and health reporting.
- Prisma schema and client regenerated and kept in sync with DB.
- Improved error handling and logging for sync jobs and API health.

### Removed
- Deprecated/unused code for customer name display and avatar.

## [Older changes]
(See previous entries for earlier releases)