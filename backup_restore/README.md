# SuitSync

![CI Status](https://github.com/your-org/suitsync_full/actions/workflows/ci.yml/badge.svg)

SuitSync is a production-grade Men's Suit Shop operations app, fully integrated with Lightspeed X-Series. It features robust backend and frontend, JWT authentication, notifications, printing, and CI/CD.

## Features
- Express + Prisma backend with Lightspeed X-Series OAuth2 integration
- PostgreSQL (or SQLite for demo) with Prisma ORM
- Next.js + Tailwind CSS frontend, mobile-first and touch-optimized
- JWT staff login, Lightspeed OAuth2 for API
- Twilio SMS + SendGrid email notifications
- ZPL/HTML tag printing
- GitHub Actions CI/CD (lint, test, deploy)

## Quick Start

### 1. Clone and Install
```sh
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
npm install
```

### 2. Environment Variables
Create a `.env` file in the root and set:
```
LS_DOMAIN=demo
LS_CLIENT_ID=your_lightspeed_client_id
LS_CLIENT_SECRET=your_lightspeed_client_secret
LS_REDIRECT_URI=http://localhost:3000/api/auth/callback
SESSION_SECRET=your_session_secret
DATABASE_URL=file:./prisma/dev.db
FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM=your_from_email
PODIUM_API_KEY=your_podium_key
```

### 3. Local Demo Run
```sh
npm run demo
```
- Starts backend on :3000 and frontend on :3001
- Loads demo data and shows real UI

### 4. Testing
- **Backend:**
  ```sh
  cd server
  npm test
  ```
- **Frontend:**
  ```sh
  cd frontend
  npm test
  ```
- **E2E (Cypress):**
  ```sh
  cd frontend
  npx cypress open
  ```

### 5. Lint & Type Check
- **Backend:** `cd server && npm run lint`
- **Frontend:** `cd frontend && npm run lint && npm run type-check`

### 6. CI/CD
- On PR: lint, type-check, test, e2e
- On main: deploys backend and frontend (Vercel)

## Folder Structure
- `backend/` — Prisma models, services, jobs
- `server/` — Express API, controllers, routes
- `frontend/` — Next.js app, UI components
- `prisma/` — Schema, migrations, seed

## Contributing
PRs welcome! Please run lint, type-check, and tests before submitting.

---

© 2024 SuitSync. All rights reserved.