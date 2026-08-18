#!/bin/bash
set -e

# z.ai build script — standalone Next.js + tarball under 50MB
# Platform: space.z-ai (Alibaba Cloud FC, 50MB inline code limit)

cd frontend

# Install dependencies (no postinstall — it's removed from package.json)
npm ci 2>/dev/null

# Build standalone
NODE_OPTIONS="--experimental-webpack-build-worker" npm run build 2>/dev/null

# Copy static assets into standalone
cp -r .next/standalone/.next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

# Trim musl binaries (sharp-libvips-linuxmusl-x64 = 17MB, not needed on glibc)
rm -rf node_modules/@img/sharp-libvips-linuxmusl-x64 2>/dev/null || true
rm -rf node_modules/sharp/build 2>/dev/null || true

# Trim other unnecessary packages
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .next/cache 2>/dev/null || true

# Create tarball from standalone output
cd .next/standalone
tar -czf /tmp/next-standalone.tar.gz .
cd ../..

# Check size
SIZE=$(du -m /tmp/next-standalone.tar.gz | cut -f1)
echo "Tarball size: ${SIZE}MB"

if [ "$SIZE" -gt 50 ]; then
  echo "ERROR: Tarball exceeds 50MB limit!"
  exit 1
fi

echo "Build complete. Tarball ready at /tmp/next-standalone.tar.gz"
