# SuitSync Production Deployment Guide

This guide outlines the steps required to deploy the SuitSync application to a production environment on a typical Linux server (e.g., Ubuntu) or using Docker Compose.

## Table of Contents
- [1. Server Prerequisites](#1-server-prerequisites)
- [2. Deployment Steps](#2-deployment-steps)
  - [Step 2.1: Clone Repository](#step-21-clone-repository)
  - [Step 2.2: Configure Production Environment](#step-22-configure-production-environment)
  - [Step 2.3: Docker Compose Deployment (Recommended)](#step-23-docker-compose-deployment-recommended)
  - [Step 2.4: Manual (PM2/Nginx) Deployment](#step-24-manual-pm2nginx-deployment)
- [3. Managing the Application](#3-managing-the-application)

---

## 1. Server Prerequisites

Before deploying, ensure your server has the following installed:
- **Node.js**: Version 18.x or later (for non-Docker/manual deployment).
- **`pnpm`**: A performant package manager. (`npm install -g pnpm`)
- **Git**: For cloning the repository.
- **PostgreSQL**: The recommended database for production (unless using Docker Compose).
- **Docker & Docker Compose**: For containerized deployment (recommended).
- **PM2**: (Optional) A process manager for Node.js to keep the application alive. (`pnpm install -g pm2`)
- **Nginx**: (Optional) A reverse proxy to manage traffic to the frontend and backend.

---

## 2. Deployment Steps

### Step 2.1: Clone Repository
Clone the project repository onto your production server.
```sh
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
```

### Step 2.2: Configure Production Environment
Create a `.env` file in the project root for your production settings. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for a full list and descriptions. **Do not use the development `dev.db` SQLite database in production.**

### Step 2.3: Docker Compose Deployment (Recommended)

1. Build and start all services (backend, frontend, database):
```sh
docker-compose up --build -d
```
- The backend API will be available at `http://localhost:3000`
- The frontend app will be available at `http://localhost:3001`

2. To view logs:
```sh
docker-compose logs -f
```

3. To stop services:
```sh
docker-compose down
```

### Step 2.4: Manual (PM2/Nginx) Deployment

1. Install dependencies:
```sh
pnpm install --frozen-lockfile
```

2. Build the frontend:
```sh
pnpm -C frontend build
```

3. Apply database migrations:
```sh
pnpm prisma migrate deploy
```

4. Start the backend and frontend with PM2:
```sh
pm2 start backend/dist/index.js --name "suitsync-api"
pm2 start "pnpm -C frontend start" --name "suitsync-frontend"
pm2 save
```

5. (Recommended) Set up Nginx as a reverse proxy. Example config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001; # Frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/; # Backend API
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 3. Managing the Application

- **Docker Compose:**
  - `docker-compose up -d` — Start all services
  - `docker-compose logs -f` — View logs
  - `docker-compose down` — Stop all services

- **PM2:**
  - `pm2 list` — View status of all running processes
  - `pm2 logs suitsync-api` — View backend logs
  - `pm2 restart suitsync-api` — Restart backend after update
  - `pm2 stop all` — Stop all applications managed by PM2

---

For more details on environment variables, Docker usage, and AI-augmented workflow, see:
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)
- [docs/DOCKER.md](docs/DOCKER.md)
- [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) 