# SuitSync: Production-Grade Retail Operations for Lightspeed X-Series

[![CI/CD Pipeline](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml)

**SuitSync** is a production-ready, full-stack retail management system specifically designed for men's suit shops. It provides seamless integration with **Lightspeed X-Series** retail platform, featuring QR-based alteration tracking, party management, appointment scheduling, and comprehensive analytics.

## 🚀 Recent Updates (v2.0)
- ✅ **Backend Dashboard** — Real-time health/status dashboard at `/`, `/api/admin/dashboard`, and `/api/admin/dashboard.json` (HTML & JSON)
- ✅ **Session/Cookie/CORS Fixes** — Secure, persistent sessions in Docker/local and production
- ✅ **Prisma Migration Requirement** — Migrations must be run in Docker before backend starts
- ✅ **Fixed Lightspeed X-Series Integration** - Corrected API endpoints and OAuth flow
- ✅ **Enhanced Session Management** - Prevents 431 header size errors
- ✅ **Added Circuit Breaker Pattern** - Improved API reliability
- ✅ **Database Error Handling** - Proper Prisma error management
- ✅ **Security Enhancements** - Rate limiting and input validation

## Table of Contents
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Key Features](#key-features)
- [Documentation](#documentation)
- [Backend Dashboard & Monitoring](#backend-dashboard--monitoring)
- [Local Development Setup](#local-development-setup)
- [Docker Usage](#docker-usage)
- [AI-Augmented Workflow](#ai-augmented-workflow)
- [Scripts and Tooling](#scripts-and-tooling)
- [Contributing](#contributing)
- [OpenAPI-Driven Type Safety for Frontend](#openapi-driven-type-safety-for-frontend)

---

## Backend Dashboard & Monitoring

- **HTML Dashboard:** `GET /` or `GET /api/admin/dashboard`
- **JSON API:** `GET /api/admin/dashboard.json`
- Shows health/status for DB, Redis, Lightspeed, job scheduler, and app info.
- Use the JSON API for frontend or external monitoring integrations.

---

## Technology Stack

### Backend
- **Framework**: Node.js with Express
- **Language**: TypeScript (with strict type safety)
- **Database ORM**: Prisma
- **Database**: PostgreSQL (recommended)
- **Authentication**: JWT for staff sessions, OAuth 2.0 for Lightspeed API
- **API**: RESTful API with robust error handling and logging.

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API & SWR for data fetching
- **UI/UX**: Mobile-first, responsive design with toast notifications and loading skeletons.

### DevOps & Tooling
- **CI/CD**: GitHub Actions for automated linting, testing, and build previews.
- **Package Manager**: `pnpm` (recommended)
- **Testing**: Jest, React Testing Library
- **Linting**: ESLint
- **Containerization**: Docker & Docker Compose for local and production environments

---

## Application Architecture

The project is organized as a monorepo to streamline development and deployment.

- **`/backend`**: The Node.js/Express backend application.
    - `controllers/`: Handles incoming API requests, business logic, and responses.
    - `routes/`: Defines all API endpoints and maps them to controllers.
    - `services/`: Core business logic modules (e.g., `syncService.ts`, `notificationService.ts`).
    - `middleware/`: Express middleware for tasks like authentication (`auth.ts`).
    - `lightspeedClient.ts`: Centralized Axios client for all Lightspeed API communication, with automated token refresh and rate limit handling.

- **`/frontend`**: The Next.js/React frontend application.
    - `pages/`: Application routes and views.
    - `components/`: Reusable UI components, including `shadcn/ui` primitives.
    - `lib/`: Utility functions and the frontend API client (`apiClient.ts`).
    - `contexts/`: React contexts for managing global state like authentication.

- **`/backend/prisma`**: Database schema, migrations, and seeding.
    - `schema.prisma`: The single source of truth for all database models and relationships.
    - `migrations/`: Automatically generated SQL migration files.
    - `seed.ts`: Script to populate the database with initial data for development and testing.

---

## Key Features

- **Backend Dashboard:** Real-time health/status dashboard at `/`, `/api/admin/dashboard`, and `/api/admin/dashboard.json` (HTML & JSON)
- **Lightspeed Integration:** Bidirectional data sync for Customers, Products, and Sales. Automatically creates and manages custom fields in Lightspeed.
- **Party & Appointment Management:** Group customers into parties (e.g., for a wedding) and schedule appointments like fittings and pickups.
- **Enhanced Alteration Workflow:** Comprehensive alteration job tracking with tailor assignment, work tracking, time management, and detailed audit trails. Supports multiple garment types (Jacket, Pants, Vest, Shirt, Dress, Skirt) and task categories (Alteration, Button Work, Measurement, Custom).
- **Tailor Assignment & Tracking:** Assign specific tailors to garment parts, track work start/finish times, record time spent, and maintain complete audit trails for quality control.
- **QR Code Integration:** Unique QR codes for each garment part enable easy scanning to start/finish work and update status.
- **Print System:** Generate individual garment tickets and complete job tickets with proper formatting for thermal printers.
- **Automated Notifications:** Utilizes Twilio and SendGrid for sending SMS and email reminders for appointments or job status updates.
- **Authentication:** Secure staff login via JWT and seamless, server-to-server Lightspeed API access via OAuth 2.0.
- **Health & Sync Monitoring:** A dedicated UI in the admin panel to monitor the status of the Lightspeed connection and the health of background sync jobs.

---

## Documentation

### Core System Documentation
- **[Alterations Quick Start](docs/ALTERATIONS_QUICK_START.md)** - Get started with the alterations workflow in minutes
- **[Alterations Workflow System](docs/ALTERATIONS_WORKFLOW.md)** - Comprehensive guide to the alteration job tracking, tailor assignment, and work management system
- **[Alterations API Reference](docs/ALTERATIONS_API_REFERENCE.md)** - Quick reference for all alteration-related API endpoints
- **[Alterations Job Creation](docs/ALTERATIONS_JOB_CREATION.md)** - Complete guide to creating and managing alteration jobs
- **[Alterations Printing System](docs/ALTERATIONS_PRINTING.md)** - Comprehensive printing system for alteration tickets and labels
- **[QR Codes System](docs/QR_CODES_SYSTEM.md)** - QR code generation, scanning, and status tracking system
- **[Party Creation and Management](docs/PARTY_MANAGEMENT.md)** - Party management for events like weddings, proms, and corporate functions
- **[Appointment System](docs/APPOINTMENT_SYSTEM.md)** - Comprehensive appointment scheduling for individuals and parties with email/SMS notifications
- **[Lightspeed Integration Guide](docs/LIGHTSPEED_INTEGRATION_GUIDE.md)** - Complete guide to Lightspeed X-Series integration
- **[Authentication Setup](docs/AUTHENTICATION_SETUP.md)** - JWT and OAuth2 setup instructions
- **[Database Schema](docs/DATABASE.md)** - Database models and relationships
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment instructions

### Development Documentation
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development setup and workflow
- **[Docker Guide](docs/DOCKER.md)** - Containerization and Docker usage
- **[Environment Configuration](docs/ENVIRONMENT.md)** - Environment variables and configuration
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation

### Testing & Quality Assurance
- **[AI Workflow](docs/AI_WORKFLOW.md)** - AI-assisted development workflow
- **[Critical Fixes](docs/CRITICAL_FIXES.md)** - Important fixes and workarounds

---

## Session, Cookie, and CORS Configuration
- Session cookies are `secure: false` in development (Docker/local), and `secure: true` in production (HTTPS).
- CORS is configured to allow credentials and uses `CORS_ORIGIN` or defaults to `http://localhost:3001`.
- The frontend API client always sends credentials with requests for session-based authentication (`credentials: 'include'`).

---

## 🔐 Authentication

SuitSync uses **Lightspeed X-Series OAuth 2.0** for secure authentication. Users must have a valid Lightspeed account to access the system.

**Key Features:**
- OAuth 2.0 integration with Lightspeed X-Series
- Session-based authentication with secure cookies
- Role-based access control synced from Lightspeed
- Automatic token refresh and session management
- Development mode with demo users for testing

**📖 For detailed authentication setup and troubleshooting, see [Authentication Setup Guide](docs/AUTHENTICATION_SETUP.md)**

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18 or later)
- `pnpm` package manager (`npm install -g pnpm`)
- Docker & Docker Compose (for containerized development)
- A Lightspeed X-Series developer account and API credentials.

### 2. Clone the Repository
```sh
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
```

### 3. Install Dependencies
This command will install dependencies for the root, `/backend`, and `/frontend` packages.
```sh
pnpm install
```

### 4. Configure Environment Variables
Create a `.env` file in the project root with your Lightspeed X-Series credentials:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@db:5432/suitsync_prod"

# Application
FRONTEND_URL=http://localhost:3001
SESSION_SECRET=your-32-char-secret-here
JWT_SECRET=your-32-char-secret-here
CORS_ORIGIN=http://localhost:3001

# Lightspeed X-Series API
LS_CLIENT_ID=your_client_id
LS_CLIENT_SECRET=your_client_secret
LS_ACCOUNT_ID=your_account_id
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### 5. Initialize the Database
**IMPORTANT:** After building containers, run Prisma migrations in Docker:
```sh
docker-compose exec backend pnpm prisma migrate deploy
```
This ensures all tables (including `ApiToken`) exist before backend starts.

### 6. Run the Development Servers
You can run the backend and frontend separately, or use Docker Compose for a fully containerized environment.

#### Option A: Native (host) development
```sh
pnpm dev:server   # Starts backend on :3000
pnpm dev:frontend # Starts frontend on :3001
```

#### Option B: Docker Compose (recommended)
```sh
docker-compose -f docker-compose.dev.yml up --build
```
- **Backend API**: `http://localhost:3000`
- **Frontend App**: `http://localhost:3001`

---

## Docker Usage

- **Local Development:**
  - Use `docker-compose.dev.yml` for a hot-reloading dev environment with backend, frontend, and Postgres containers.
  - All code changes are reflected live via volume mounts.
- **Production:**
  - Use `docker-compose.yml` for a production-like environment. This builds and runs optimized containers for backend, frontend, and database.
  - Ensure all environment variables are set in `.env` and secrets are managed securely.
  - **Prisma Migrations:** After building, run:
    ```sh
    docker-compose exec backend pnpm prisma migrate deploy
    ```
- **Troubleshooting:**
  - Use `docker-compose logs` to view service logs.
  - If you see migration or session issues, check backend logs and Prisma migration state.
  - For Compose version warnings, update to the latest Compose spec.

---

## AI-Augmented Workflow

See [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) for best practices on using AI tools (Cursor, Copilot, ChatGPT, etc.) to refactor, debug, and extend SuitSync. Highlights:
- Use AI to review backend and frontend code for compliance, error handling, and integration with Lightspeed.
- Prompt AI to generate or improve tests, documentation, and code modernization.
- Use project-wide search for keywords like `customer`, `group`, `sale`, `commission`, `sync`, `alteration` to audit integration points.

---

## Scripts and Tooling

- `pnpm dev:server`: Starts backend server for development.
- `pnpm dev:frontend`: Starts frontend server for development.
- `pnpm db:init`: Resets the database, applies migrations, and runs the seed script.
- `pnpm lint`: Runs ESLint on both `/backend` and `/frontend`.
- `pnpm test`: Runs Jest tests for both `/backend` and `/frontend`.

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change. Please ensure to update tests and run the linter before submitting a PR.

---

## OpenAPI-Driven Type Safety for Frontend

SuitSync uses an automated workflow to keep frontend TypeScript types in sync with backend API responses:

1. The backend (Node.js/Express) uses tsoa to generate an OpenAPI (Swagger) spec from TypeScript controllers.
2. The frontend runs `pnpm run gen:openapi-types` to generate TypeScript types from the OpenAPI spec using [openapi-typescript](https://github.com/drwpow/openapi-typescript).
3. These types are used in API calls for full type safety and autocompletion.

**Workflow:**
- After backend changes, run `pnpm run tsoa:spec` in `backend/`.
- Then run `pnpm run gen:openapi-types` in `frontend/`.

**Benefits:**
- No manual drift between backend and frontend types
- Type errors surface immediately if the API changes
- Easy onboarding for new developers

See [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md#using-openapi-generated-types-in-the-frontend) for full details and usage examples.

---

© 2024 SuitSync. All rights reserved.