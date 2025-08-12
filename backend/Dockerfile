# Stage 1: Development
FROM node:20-alpine AS development
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and Prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY . ./

# Generate tsoa routes + spec
RUN npm run tsoa:routes && npm run tsoa:spec

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and Prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY . ./

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh || true

# Generate tsoa routes + spec
RUN npm run tsoa:routes && npm run tsoa:spec

# Build TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
# Run migrations and seed before starting the server
CMD ["sh", "/app/entrypoint.sh"]