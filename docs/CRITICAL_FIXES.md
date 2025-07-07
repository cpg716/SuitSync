# Critical Fixes

## Session/Cookie/CORS Issues
- If you experience session persistence or authentication failures:
  - Ensure session cookies are `secure: false` in development (Docker/local), and `secure: true` in production (HTTPS).
  - CORS must allow credentials and use `CORS_ORIGIN` (default: `http://localhost:3001`).
  - The frontend API client must send `credentials: 'include'` on all requests.
- See the backend dashboard at `/` or `/api/admin/dashboard` for live session and Redis health.

## Migration Issues
- If you see missing table errors (e.g., `ApiToken`), run:
  ```sh
  docker-compose exec backend pnpm prisma migrate deploy
  ```
- This ensures all tables exist before backend starts.

- [2025-07-07] Fixed Prisma schema and client to match SyncStatus table (case-sensitive, correct mapping).
- [2025-07-07] Backend now always returns all sync resources in health endpoint, never shows 'Idle' when synced.
- [2025-07-07] Customer list now sorts by last name, missing last names at end, and search works for all fields.
- [2025-07-07] Removed leading avatar/letter from customer list for clarity.
- [2025-07-07] Docker/Windows migration fully supported; all scripts and environment variables cross-platform.
- [2025-07-07] Improved error handling and logging for sync jobs and API health.

--- 