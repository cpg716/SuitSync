# Stage 1: Development
FROM node:20-alpine AS development
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm \
 && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm \
 && pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.js ./
COPY --from=build /app/next-env.d.ts ./
COPY --from=build /app/tsconfig.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

EXPOSE 3000
CMD ["pnpm", "start"]