# SuitSync Production Deployment Guide

This guide outlines the steps required to deploy the SuitSync application to a production environment using Docker Compose or manual methods. It is up to date for v2.0+ and includes backup/restore and migration notes.

## Table of Contents
- [1. Prerequisites](#1-prerequisites)
- [2. Quick Start (Docker)](#2-quick-start-docker)
- [3. Environment Configuration](#3-environment-configuration)
- [4. Deploy](#4-deploy)
- [5. Backup & Restore](#5-backup--restore)
- [6. Migration Troubleshooting](#6-migration-troubleshooting)
- [7. Security Checklist](#7-security-checklist)
- [8. Managing the Application](#8-managing-the-application)

---

## 1. Prerequisites
- Docker & Docker Compose
- Lightspeed X-Series API credentials
- PostgreSQL database (or use included Docker setup)
- Node.js 18+ and pnpm (for manual/PM2 deployment)
- Git
- Lightspeed, Redis, SendGrid, and Twilio credentials in `.env`

## 2. Quick Start (Docker)

```sh
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
cp .env.example .env
# Edit .env with your credentials
```

## 3. Environment Configuration
See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for a full list and descriptions. **Do not use the development `dev.db` SQLite database in production.**

## 4. Deploy

### Development
```sh
docker-compose -f docker-compose.dev.yml up --build
```

### Production
```sh
docker-compose up --build -d
```
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

### Manual (PM2/Nginx) Deployment
See previous guide for details if not using Docker Compose.

## 5. Backup & Restore
- **Backup entire app:**
  ```sh
  tar -czvf suitsync_full_clean_backup_$(date +%Y%m%d_%H%M%S).tar.gz .
  ```
- **Restore:**
  ```sh
  tar -xzvf suitsync_full_clean_backup_<timestamp>.tar.gz
  ```
- **Database-only backup:**
  ```sh
  docker-compose exec db pg_dump -U postgres suitsync_prod > backup.sql
  ```
- **Database restore:**
  ```sh
  docker-compose exec -T db psql -U postgres suitsync_prod < backup.sql
  ```

## 6. Migration Troubleshooting
- If you see errors about missing columns (e.g., `pinHash`), run:
  ```sh
  cd backend && npm install && cd ..
  docker-compose build backend
  docker-compose run --rm backend npx prisma migrate deploy --schema prisma/schema.prisma
  docker-compose restart backend
  ```
- Always keep `package-lock.json` and `package.json` in sync after schema changes.

## 7. Security Checklist
- [ ] Use strong SESSION_SECRET and JWT_SECRET (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Regular database backups
- [ ] Monitor error logs
- [ ] Update dependencies regularly

## 8. Managing the Application
- **Docker Compose:**
  - `docker-compose up -d` — Start all services
  - `docker-compose logs -f` — View logs
  - `docker-compose down` — Stop all services
- **PM2:**
  - `pm2 list` — View status of all running processes
  - `pm2 logs suitsync-api` — View backend logs
  - `pm2 restart suitsync-api` — Restart backend after update
  - `pm2 stop all` — Stop all applications managed by PM2

For more details on environment variables, Docker usage, and AI-augmented workflow, see:
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)
- [docs/DOCKER.md](docs/DOCKER.md)
- [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)

## 2. Environment Variables
- Ensure `.env` contains:
  - DATABASE_URL (matches db service in docker-compose)
  - SESSION_SECRET (32+ chars)
  - LS_CLIENT_ID, LS_CLIENT_SECRET, LS_REFRESH_TOKEN, LS_DOMAIN
  - REDIS_URL=redis://redis:6379
  - CORS_ORIGIN=http://localhost:3001 (for local dev)

## 3. Running Migrations
- Before starting backend, run:
  ```sh
  docker-compose exec backend pnpm prisma migrate deploy
  ```
- This ensures all tables (including ApiToken) exist.

## 4. Starting the App
- Use:
  ```sh
  docker-compose up -d
  ```
- Frontend: http://localhost:3001
- Backend/API: http://localhost:3000

## 5. Session & Cookie Config
- Session cookies are `secure: false` in dev, `secure: true` in production.
- CORS allows credentials and uses `CORS_ORIGIN`.
- Frontend API client must send `credentials: 'include'` on all requests.

## 6. Health & Monitoring
- Backend dashboard: http://localhost:3000/
- Dashboard JSON API: http://localhost:3000/api/admin/dashboard.json
- Check Redis: `docker exec -it <redis_container> redis-cli ping`
- Check DB: `docker exec -it <db_container> psql -U <user> -d <db> -c '\l'`

## 7. Troubleshooting
- If you see Prisma errors, ensure migrations are applied and DATABASE_URL matches your db service.
- If session/auth fails, check CORS, cookie, and frontend credentials settings.
- For 500/404 errors, check backend logs and dashboard for service health. 