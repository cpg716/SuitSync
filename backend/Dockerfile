# --- builder --------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 1) Install deps & generate Prisma client
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
RUN ls -l /app/node_modules/.prisma/client
RUN npm install -g npm@11.4.2

# 2) Copy source & build
COPY . .
RUN npm run build

# --- runner --------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 1) Pull only runtime artifacts
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN ls -l /app/node_modules/.prisma/client
RUN npm install -g npm@11.4.2

# 2) Healthcheck waits for Postgres
HEALTHCHECK --interval=10s --timeout=5s \
  CMD pg_isready -h postgres -p 5432 || exit 1

# 3) On start: deploy migrations, seed, then run server
CMD ["sh", "-c", "if [ ! -d ./node_modules/.prisma/client ]; then npx prisma generate; fi && npx prisma migrate deploy && node dist/seed.js && node dist/index.js"] 