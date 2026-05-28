#!/bin/sh
set -e

echo "[demo-entrypoint] Generating Prisma client..."
npx prisma generate

echo "[demo-entrypoint] Running migrations (deploy)..."
# Use migrate deploy for non-interactive migration; ignore failures if none
npx prisma migrate deploy || true

echo "[demo-entrypoint] Seeding database (if applicable)..."
node prisma/seed.js || true

echo "[demo-entrypoint] Starting backend..."
node src/index.js
