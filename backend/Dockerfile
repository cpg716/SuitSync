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
RUN npm run build || true

# --- runner --------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install curl for health checks
RUN apk add --no-cache curl

# 1) Pull only runtime artifacts
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 2) Healthcheck for the application
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/monitoring/health || exit 1

# 3) Copy entrypoint and run
COPY entrypoint.sh /app/entrypoint.sh

# Add build arg for versioning
ARG BUILD_DATE
ARG GIT_COMMIT
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$GIT_COMMIT

# At the end of the runner stage, add a version log
RUN echo "Build date: $BUILD_DATE, Commit: $GIT_COMMIT" > /app/VERSION.txt

CMD ["sh", "-c", "cat /app/VERSION.txt; if [ ! -d ./node_modules/.prisma/client ]; then npx prisma generate; fi && npx prisma migrate deploy && node dist/seed.js && node dist/index.js"]