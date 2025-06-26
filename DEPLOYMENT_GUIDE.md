# SuitSync Production Deployment Guide

This guide outlines the steps required to deploy the SuitSync application to a production environment on a typical Linux server (e.g., Ubuntu).

## Table of Contents
- [1. Server Prerequisites](#1-server-prerequisites)
- [2. Deployment Steps](#2-deployment-steps)
  - [Step 2.1: Clone Repository](#step-21-clone-repository)
  - [Step 2.2: Install Dependencies](#step-22-install-dependencies)
  - [Step 2.3: Configure Production Environment](#step-23-configure-production-environment)
  - [Step 2.4: Build the Frontend](#step-24-build-the-frontend)
  - [Step 2.5: Apply Database Migrations](#step-25-apply-database-migrations)
  - [Step 2.6: Start the Application with PM2](#step-26-start-the-application-with-pm2)
- [3. Recommended: Reverse Proxy with Nginx](#3-recommended-reverse-proxy-with-nginx)
- [4. Managing the Application](#4-managing-the-application)

---

## 1. Server Prerequisites

Before deploying, ensure your server has the following installed:
- **Node.js**: Version 18.x or later.
- **`pnpm`**: A performant package manager. (`npm install -g pnpm`)
- **Git**: For cloning the repository.
- **PostgreSQL**: The recommended database for production.
- **PM2**: A process manager for Node.js to keep the application alive. (`pnpm install -g pm2`)
- **Nginx**: (Recommended) A reverse proxy to manage traffic to the frontend and backend.

---

## 2. Deployment Steps

### Step 2.1: Clone Repository
Clone the project repository onto your production server.
```sh
git clone https://github.com/your-org/suitsync_full.git
cd suitsync_full
```

### Step 2.2: Install Dependencies
Install all project dependencies using `pnpm`. This will install for the root, `/server`, and `/frontend` packages.
```sh
pnpm install --frozen-lockfile
```

### Step 2.3: Configure Production Environment
Create a `.env` file in the project root for your production settings. **Do not use the development `dev.db` SQLite database in production.**

```dotenv
# --- PRODUCTION .env file ---

# Node Environment
NODE_ENV=production

# Lightspeed API Credentials
LS_DOMAIN="your_production_store"
LS_CLIENT_ID="your_production_lightspeed_client_id"
LS_CLIENT_SECRET="your_production_lightspeed_client_secret"
LS_REDIRECT_URI="https://yourdomain.com/api/auth/callback"
LS_PERSONAL_ACCESS_TOKEN="your_production_lightspeed_personal_access_token"

# Application Settings
SESSION_SECRET="generate_a_very_strong_random_secret_for_production"
DATABASE_URL="postgresql://user:password@localhost:5432/suitsync?schema=public"
FRONTEND_URL="https://yourdomain.com"
NEXT_PUBLIC_API_URL="https://yourdomain.com/api"

# Notification Services (Optional)
SENDGRID_API_KEY="..."
TWILIO_ACCOUNT_SID="..."
# ... etc.
```

### Step 2.4: Build the Frontend
Create a production-ready, optimized build of the Next.js application.
```sh
pnpm -C frontend build
```
This creates an optimized build in the `frontend/.next` directory.

### Step 2.5: Apply Database Migrations
Run the Prisma migrations against your production database to ensure the schema is up to date.
```sh
pnpm prisma migrate deploy
```

### Step 2.6: Start the Application with PM2
We will use PM2 to run both the backend server and the frontend application as separate, managed processes.

**1. Start the Backend API Server:**
```sh
pm2 start server/index.js --name "suitsync-api"
```

**2. Start the Frontend Application:**
```sh
pm2 start "pnpm -C frontend start" --name "suitsync-frontend"
```

**3. Save the Process List:**
Save the current process list so PM2 will automatically restart them on server reboot.
```sh
pm2 save
```

Your application is now running. The backend API is on port 3000 and the frontend is on port 3001.

---

## 3. Recommended: Reverse Proxy with Nginx

To make your application accessible on standard ports (80/443) and manage traffic efficiently, use Nginx as a reverse proxy.

Here is a sample Nginx configuration (`/etc/nginx/sites-available/yourdomain.com`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect http to https (if you have SSL)
    # return 301 https://$host$request_uri;

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
Enable this configuration by creating a symlink and restarting Nginx.

---

## 4. Managing the Application

Here are some useful PM2 commands for managing your live application:

- **`pm2 list`**: View the status of all running processes.
- **`pm2 logs suitsync-api`**: View the logs for the backend server.
- **`pm2 restart suitsync-api`**: Restart the backend server after an update.
- **`pm2 stop all`**: Stop all applications managed by PM2.
``` 