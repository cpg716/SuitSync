# SuitSync: Production-Grade Retail Operations for Lightspeed X-Series

[![CI/CD Pipeline](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml)

**SuitSync** is a full-stack, production-ready application designed to streamline operations for a men's suit shop by providing deep, bidirectional integration with the **Lightspeed X-Series** retail platform. It handles everything from party and appointment management to job tracking, notifications, and analytics, all built on a modern, robust technology stack.

## Table of Contents
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Key Features](#key-features)
- [Local Development Setup](#local-development-setup)
- [Scripts and Tooling](#scripts-and-tooling)
- [Contributing](#contributing)

---

## Technology Stack

### Backend
- **Framework**: Node.js with Express
- **Language**: JavaScript (with JSDoc for type safety)
- **Database ORM**: Prisma
- **Database**: PostgreSQL (recommended) or SQLite (for demo)
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

---

## Application Architecture

The project is organized as a monorepo to streamline development and deployment.

- **`/server`**: The Node.js/Express backend application.
    - `controllers/`: Handles incoming API requests, business logic, and responses.
    - `routes/`: Defines all API endpoints and maps them to controllers.
    - `services/`: Contains core business logic modules (e.g., `syncService.js`, `workflowService.js`).
    - `middleware/`: Express middleware for tasks like authentication (`auth.js`).
    - `lightspeedClient.js`: A robust, centralized Axios client for all Lightspeed API communication, featuring automated token refresh and rate limit handling.

- **`/frontend`**: The Next.js/React frontend application.
    - `pages/`: Application routes and views.
    - `components/`: Reusable UI components, including `shadcn/ui` primitives.
    - `lib/`: Utility functions and the frontend API client (`apiClient.ts`).
    - `contexts/`: React contexts for managing global state like authentication.

- **`/prisma`**: Database schema, migrations, and seeding.
    - `schema.prisma`: The single source of truth for all database models and relationships.
    - `migrations/`: Automatically generated SQL migration files.
    - `seed.js`: A script to populate the database with initial data for development and testing.

---

## Key Features

- **Lightspeed Integration**: Bidirectional data sync for Customers, Products, and Sales. Automatically creates and manages custom fields in Lightspeed.
- **Party & Appointment Management**: Group customers into parties (e.g., for a wedding) and schedule appointments like fittings and pickups.
- **Alteration Job Tracking**: Create and manage alteration jobs linked to specific sale line items, assign them to tailors, and track their status.
- **Automated Notifications**: Utilizes Twilio and SendGrid for sending SMS and email reminders for appointments or job status updates.
- **Authentication**: Secure staff login via JWT and seamless, server-to-server Lightspeed API access via OAuth 2.0.
- **Health & Sync Monitoring**: A dedicated UI in the admin panel to monitor the status of the Lightspeed connection and the health of background sync jobs.

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18 or later)
- `pnpm` package manager (`npm install -g pnpm`)
- A Lightspeed X-Series developer account and API credentials.

### 2. Clone the Repository
```sh
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
```

### 3. Install Dependencies
This command will install dependencies for the root, `/server`, and `/frontend` packages.
```sh
pnpm install
```

### 4. Configure Environment Variables
Create a `.env` file in the project root. This file is critical for connecting to Lightspeed and other services.
```dotenv
# Lightspeed API Credentials
LS_DOMAIN="your-store" # e.g., "suitsync-demo"
LS_CLIENT_ID="your_lightspeed_client_id"
LS_CLIENT_SECRET="your_lightspeed_client_secret"
LS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
LS_PERSONAL_ACCESS_TOKEN="your_lightspeed_personal_access_token_for_system_tasks"

# Application Settings
SESSION_SECRET="a_strong_and_long_random_string_for_sessions"
DATABASE_URL="file:./prisma/dev.db" # Use PostgreSQL in production
FRONTEND_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Notification Services (Optional)
SENDGRID_API_KEY="your_sendgrid_key"
SENDGRID_FROM="notifications@yourdomain.com"
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+15551234567"
```
**Note:** The `LS_PERSONAL_ACCESS_TOKEN` is used for system-level background tasks like the initial data sync and is recommended for production.

### 5. Initialize the Database
This command runs Prisma migrations to set up your database schema and then runs the seed script to populate it with initial data.
```sh
pnpm db:init
```

### 6. Run the Development Servers
This will start the backend on port 3000 and the frontend on port 3001 concurrently.
```sh
pnpm dev
```
- **Backend API**: `http://localhost:3000`
- **Frontend App**: `http://localhost:3001`

---

## Scripts and Tooling

- `pnpm dev`: Starts both backend and frontend servers for development.
- `pnpm db:init`: Resets the database, applies migrations, and runs the seed script.
- `pnpm lint`: Runs ESLint on both `/server` and `/frontend`.
- `pnpm test`: Runs Jest tests for both `/server` and `/frontend`.

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change. Please ensure to update tests and run the linter before submitting a PR.

---

© 2024 SuitSync. All rights reserved.