# Docker Configuration and Usage Guide

This document provides comprehensive information about using Docker with SuitSync for development and production environments.

## Overview

SuitSync supports multiple Docker configurations:
- **Development**: Hot-reloading environment with volume mounts
- **Production**: Optimized builds with multi-stage Dockerfiles
- **Testing**: Isolated environment for CI/CD pipelines

## Docker Compose Configurations

### Development Environment (`docker-compose.dev.yml`)

**Purpose**: Local development with hot-reloading and debugging capabilities.

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Features**:
- Volume mounts for live code reloading
- PostgreSQL database with persistent storage
- Development-optimized build process
- Debug ports exposed

### Production Environment (`docker-compose.yml`)

**Purpose**: Production-ready deployment with optimized containers.

```bash
# Start production environment
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (careful!)
docker-compose down -v
```

**Features**:
- Multi-stage builds for smaller images
- Production environment variables
- Health checks for all services
- Optimized for performance and security

## Individual Service Dockerfiles

### Backend Dockerfile (`backend/Dockerfile`)

**Multi-stage build process**:
1. **Build stage**: Install dependencies, compile TypeScript
2. **Production stage**: Copy built assets, minimal runtime

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

### Frontend Dockerfile (`frontend/Dockerfile`)

**Optimized for Next.js**:
1. **Build stage**: Install dependencies, build static assets
2. **Production stage**: Serve optimized application

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

## Environment Configuration

### Development Environment Variables
```bash
# Create .env.docker for development
NODE_ENV=development
DATABASE_URL=postgresql://suitsync:supersecret@postgres:5432/suitsync
FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Production Environment Variables
```bash
# Production environment (use secrets management)
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/suitsync_prod
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## Common Docker Commands

### Development Workflow
```bash
# Build and start all services
docker-compose -f docker-compose.dev.yml up --build

# Rebuild specific service
docker-compose -f docker-compose.dev.yml build backend
docker-compose -f docker-compose.dev.yml up backend

# Execute commands in running container
docker-compose -f docker-compose.dev.yml exec backend npm run prisma:migrate
docker-compose -f docker-compose.dev.yml exec backend npm run seed

# View service logs
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs frontend
```

### Database Operations
```bash
# Run Prisma migrations
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev

# Seed database
docker-compose -f docker-compose.dev.yml exec backend npm run seed

# Access database directly
docker-compose -f docker-compose.dev.yml exec postgres psql -U suitsync -d suitsync

# Backup database
docker-compose -f docker-compose.dev.yml exec postgres pg_dump -U suitsync suitsync > backup.sql
```

### Debugging and Troubleshooting
```bash
# Check container status
docker-compose -f docker-compose.dev.yml ps

# Inspect container
docker-compose -f docker-compose.dev.yml exec backend sh

# View container resource usage
docker stats

# Clean up unused containers and images
docker system prune -a
```

## Volume Management

### Development Volumes
- **Code volumes**: Enable hot-reloading for development
- **Node modules**: Prevent host/container conflicts
- **Database volume**: Persist data between restarts

### Production Volumes
- **Database volume**: Persistent storage for PostgreSQL
- **Uploads volume**: Store user-uploaded files
- **Logs volume**: Centralized logging

## Health Checks

### Backend Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### Database Health Check
```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U suitsync || exit 1
```

### Frontend Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1
```

## Performance Optimization

### Image Size Optimization
- Use Alpine Linux base images
- Multi-stage builds to exclude dev dependencies
- .dockerignore to exclude unnecessary files
- Layer caching optimization

### Runtime Optimization
- Resource limits for containers
- Proper health check intervals
- Efficient volume mounting
- Network optimization

## Security Best Practices

### Container Security
- Run as non-root user
- Use specific image tags (not `latest`)
- Scan images for vulnerabilities
- Limit container capabilities

### Network Security
- Use internal networks for service communication
- Expose only necessary ports
- Implement proper firewall rules
- Use secrets for sensitive data

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build and test with Docker
  run: |
    docker-compose -f docker-compose.dev.yml build
    docker-compose -f docker-compose.dev.yml run --rm backend npm test
    docker-compose -f docker-compose.dev.yml run --rm frontend npm test
```

### Production Deployment
```bash
# Build production images
docker-compose build

# Deploy to production
docker-compose up -d

# Health check
docker-compose ps
```

## Troubleshooting

### Common Issues

**Port conflicts**
```bash
# Check what's using the port
lsof -i :3000

# Use different ports
docker-compose -f docker-compose.dev.yml up --build -p 3001:3000
```

**Volume permission issues**
```bash
# Fix permissions
sudo chown -R $USER:$USER ./backend/node_modules
```

**Database connection issues**
```bash
# Check database logs
docker-compose -f docker-compose.dev.yml logs postgres

# Verify connection
docker-compose -f docker-compose.dev.yml exec backend npm run prisma:studio
```

**Memory issues**
```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Monitor container memory usage
docker stats
```

## Running SuitSync in Docker

- Use `docker-compose.yml` for production-like environments.
- Use `docker-compose.dev.yml` for hot-reloading local development.

## Backend Dashboard
- HTML: `http://localhost:3000/` or `/api/admin/dashboard`
- JSON: `/api/admin/dashboard.json`
- Shows health/status for DB, Redis, Lightspeed, jobs, and app info.

## Session, Cookie, and CORS
- Session cookies are `secure: false` in dev, `secure: true` in production.
- CORS allows credentials and uses `FRONTEND_URL` (default: `http://localhost:3001`).
- Frontend API client must send `credentials: 'include'` on all requests.

## Prisma Migrations
- After building containers, run:
  ```sh
  docker-compose exec backend pnpm prisma migrate deploy
  ```
- This ensures all tables (including `ApiToken`) exist before backend starts.

## Troubleshooting
- Use the backend dashboard for live health checks.
- For session/auth issues, check CORS, cookie, and frontend credentials settings.
- For DB errors, ensure migrations are applied and `DATABASE_URL` matches your db service.

For more information, see the main [README.md](../README.md) and [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md).
