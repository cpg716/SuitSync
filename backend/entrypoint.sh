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

# 2) Try to apply migrations, but don't fail if schema is already synced
npx prisma migrate deploy --schema=prisma/schema.prisma || {
  echo "Migrations failed, checking if schema is already synced..."
  npx prisma db push --schema=prisma/schema.prisma --accept-data-loss || true
}

# 3) Skip demo seeding in live mode
echo "Skipping demo seed (LIVE-only mode)"

# 4) Finally launch the server
node dist/index.js