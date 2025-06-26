# SuitSync Windows Deployment & Multi-User Access Guide

**Date:** {{DATE}}

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend (API) Setup](#backend-api-setup)
4. [Frontend Setup](#frontend-setup)
5. [Firewall & Network Configuration](#firewall--network-configuration)
6. [Multi-User Access](#multi-user-access)
7. [Optional: Native Windows Admin App (Electron)](#optional-native-windows-admin-app-electron)
8. [Updates & Maintenance](#updates--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites
- **Node.js & npm:** [Download](https://nodejs.org/en/download/)
- **Git:** [Download](https://git-scm.com/download/win)
- **PostgreSQL:** [Download](https://www.postgresql.org/download/windows/)
- **(Optional) Electron:** For a native Windows admin app

---

## 2. Database Setup
### Install PostgreSQL
- Download and run the installer from the official site.
- Set a password for the `postgres` user and remember it.

### Create Database & User
1. Open **pgAdmin** or use the command line:
   ```sh
   psql -U postgres
   CREATE DATABASE suitsync;
   CREATE USER suitsync_user WITH PASSWORD 'yourpassword';
   GRANT ALL PRIVILEGES ON DATABASE suitsync TO suitsync_user;
   ```
2. Update `/server/.env`:
   ```env
   DATABASE_URL=postgresql://suitsync_user:yourpassword@localhost:5432/suitsync
   ```

---

## 3. Backend (API) Setup
1. Open Command Prompt and navigate to the backend folder:
   ```sh
   cd \SuitSync\server
   npm install
   npm run build
   npm start
   ```
2. The API will run at: [http://localhost:3000](http://localhost:3000)

### (Recommended) Run as a Service
- Install [PM2](https://pm2.keymetrics.io/):
  ```sh
  npm install -g pm2
  pm2 start npm --name suitsync-backend -- run start
  pm2 save
  pm2 startup
  ```
- This ensures the backend restarts on reboot.

---

## 4. Frontend Setup
1. Open a new Command Prompt:
   ```sh
   cd \SuitSync\frontend
   npm install
   npm run build
   npm start
   ```
2. The frontend will run at: [http://localhost:3001](http://localhost:3001)

- (Optional) Use PM2 for the frontend as well:
  ```sh
  pm2 start npm --name suitsync-frontend -- run start
  pm2 save
  ```

---

## 5. Firewall & Network Configuration
1. **Allow inbound connections** on ports 3000 (API) and 3001 (Frontend) in Windows Firewall.
2. **Set a static IP** for the server PC:
   - Open Command Prompt, run:
     ```sh
     ipconfig
     ```
   - Note the `IPv4 Address` (e.g., `192.168.1.100`).
   - Set this as a static IP in your router or Windows network settings.

---

## 6. Multi-User Access
- **From any device on the same network:**
  - Open a browser and go to:
    ```
    http://[SERVER_IP]:3001
    ```
    (Replace `[SERVER_IP]` with your server's static IP)
- **PWA (Progressive Web App):**
  - In Chrome/Edge, use "Install as App" or "Add to Home Screen".
- **Login:**
  - Use Lightspeed credentials.

---

## 7. Optional: Native Windows Admin App (Electron)
1. **Install Electron globally:**
   ```sh
   npm install -g electron
   ```
2. **Create a minimal `main.js`:**
   ```js
   const { app, BrowserWindow } = require('electron');
   app.on('ready', () => {
     const win = new BrowserWindow({ width: 1100, height: 800 });
     win.loadURL('http://localhost:3001');
   });
   ```
3. **Run Electron:**
   ```sh
   electron main.js
   ```
4. **(Optional) Package as .exe:**
   - Use [Electron Forge](https://www.electronforge.io/) or [Electron Builder](https://www.electron.build/) for a distributable Windows app.

---

## 8. Updates & Maintenance
- **To update the app:**
  1. Open Command Prompt in each folder (`server` and `frontend`):
     ```sh
     git pull
     npm install
     npm run build
     pm2 restart all
     ```
- **Remote access:**
  - Use AnyDesk, TeamViewer, or Windows Remote Desktop for support.
- **Database backups:**
  - Use `pg_dump` or a scheduled backup tool for PostgreSQL.

---

## 9. Troubleshooting
- **App not loading on other devices?**
  - Check firewall rules and static IP.
  - Ensure both backend and frontend are running.
- **OAuth redirect issues?**
  - Set your Lightspeed app's redirect URI and `.env` to use the server's IP, not `localhost`.
- **Database connection errors?**
  - Check PostgreSQL is running and credentials are correct in `.env`.
- **Automatic restart not working?**
  - Make sure PM2 is installed and `pm2 save`/`pm2 startup` have been run.

---

**For advanced setup, cloud/VPN, or packaging Electron: ask your IT provider or developer.**

---

*End of Guide* 