# --- builder --------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 1) Install deps & generate Prisma client
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# 2) Copy source & build
COPY . .
RUN npm run build

# --- runner --------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install curl for health checks
RUN apk add --no-cache curl

# 1) Pull only runtime artifacts
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 2) Healthcheck for the application
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 3) On start: deploy migrations, then run server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]