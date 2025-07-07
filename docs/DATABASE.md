# Database Guide

## Database Setup
- SuitSync uses PostgreSQL as the primary database.
- The schema is managed with Prisma ORM.

## Migrations
- All schema changes are tracked in `/backend/prisma/migrations/`.
- **IMPORTANT:** After building containers, run Prisma migrations in Docker:
  ```sh
  docker-compose exec backend pnpm prisma migrate deploy
  ```
- This ensures all tables (including `ApiToken`) exist before backend starts.

## Health & Monitoring
- Check database health and table list on the backend dashboard at `http://localhost:3000/` or `/api/admin/dashboard`.

## Troubleshooting
- If you see `PrismaClientInitializationError` or missing table errors, ensure migrations are applied and `DATABASE_URL` matches your db service.

--- 