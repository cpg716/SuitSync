#!/usr/bin/env sh
set -e

# 1) If that one migration ever failed, mark it rolled-back so P3009 clears:
# Skip resolving specific rollback if not present
if npx prisma migrate status --schema=prisma/schema.prisma | grep -q 20250701155334_enhanced_appointment_workflow; then
  npx prisma migrate resolve \
    --schema=prisma/schema.prisma \
    --rolled-back 20250701155334_enhanced_appointment_workflow \
    || true
fi

# 2) Apply all pending migrations
npx prisma migrate deploy --schema=prisma/schema.prisma

# 3) Seed your database
# Seed non-destructively; ignore duplicate errors
npm run seed || true

# 4) Finally launch the server
node dist/index.js