# SuitSync: Production-Grade Retail Operations for Lightspeed X-Series

[![CI/CD Pipeline](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml)

**SuitSync** is a full-stack, production-ready application designed to streamline operations for a men's suit shop by providing deep, bidirectional integration with the **Lightspeed X-Series** retail platform. It handles everything from party and appointment management to job tracking, notifications, and analytics, all built on a modern, robust technology stack.

## Table of Contents
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Key Features](#key-features)
- [Local Development Setup](#local-development-setup)
- [Docker Usage](#docker-usage)
- [AI-Augmented Workflow](#ai-augmented-workflow)
- [Scripts and Tooling](#scripts-and-tooling)
- [Contributing](#contributing)

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

- **Lightspeed Integration**: Bidirectional data sync for Customers, Products, and Sales. Automatically creates and manages custom fields in Lightspeed.
- **Party & Appointment Management**: Group customers into parties (e.g., for a wedding) and schedule appointments like fittings and pickups.
- **Alteration Job Tracking**: Create and manage alteration jobs linked to specific sale line items, assign them to tailors, and track their status.
- **Automated Notifications**: Utilizes Twilio and SendGrid for sending SMS and email reminders for appointments or job status updates.
- **Authentication**: Secure staff login via JWT and seamless, server-to-server Lightspeed API access via OAuth 2.0.
- **Health & Sync Monitoring**: A dedicated UI in the admin panel to monitor the status of the Lightspeed connection and the health of background sync jobs.

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
Create a `.env` file in the project root. This file is critical for connecting to Lightspeed and other services. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for a full list and descriptions.

### 5. Initialize the Database
This command runs Prisma migrations to set up your database schema and then runs the seed script to populate it with initial data.
```sh
pnpm db:init
```

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

© 2024 SuitSync. All rights reserved.