#!/bin/bash
set -e

# z.ai start — build + start standalone (called by platform on deploy)
cd frontend

npm ci --loglevel=error 2>&1
npm run build 2>&1

# Copy static assets into standalone (из исходной сборки — standalone их не содержит)
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
[ -d .next/standalone/.next/static/chunks ] || { echo "FATAL: chunks отсутствуют"; exit 1; }

# Trim musl binaries
STANDALONE_NM=".next/standalone/node_modules"
rm -rf "$STANDALONE_NM/@img/sharp-libvips-linuxmusl-x64" 2>/dev/null || true
rm -rf "$STANDALONE_NM/@img/sharp-libvips-linux-x64" 2>/dev/null || true
rm -rf "$STANDALONE_NM/sharp/build" 2>/dev/null || true
rm -rf .next/cache .next/standalone/.next/cache "$STANDALONE_NM/.cache" 2>/dev/null || true
find "$STANDALONE_NM" -name "*.d.ts" -delete 2>/dev/null || true
find "$STANDALONE_NM" -name "*.d.mts" -delete 2>/dev/null || true
find "$STANDALONE_NM" -type d \( -name "doc" -o -name "docs" -o -name "example" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null || true
find "$STANDALONE_NM" -maxdepth 2 -name "*.md" -delete 2>/dev/null || true

# Start production server from standalone
cd .next/standalone
set -a; source ../../.env 2>/dev/null || true; set +a
PORT=3000 HOSTNAME=0.0.0.0 exec node server.js
