#!/usr/bin/env sh
set -e

# 1) If that one migration ever failed, mark it rolled-back so P3009 clears:
npx prisma migrate resolve \
  --schema=prisma/schema.prisma \
  --rolled-back 20250701155334_enhanced_appointment_workflow \
  || true

# 2) Apply all pending migrations
npx prisma migrate deploy --schema=prisma/schema.prisma

# 3) Seed your database
npm run seed

# 4) Finally launch the server
node dist/index.js