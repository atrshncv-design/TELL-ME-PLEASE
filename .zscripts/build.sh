#!/bin/bash
set -e

# z.ai build script — standalone Next.js + tarball under 50MB
# Platform: space.z-ai (Alibaba Cloud FC, 50MB inline code limit)

cd frontend

# Install dependencies (no postinstall — it's removed from package.json)
npm ci --loglevel=error 2>&1

# Build standalone
npm run build 2>&1

# Copy static assets into standalone
cp -r .next/standalone/.next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

# ── Trim INSIDE standalone (this is what gets tarballed) ──
STANDALONE_NM=".next/standalone/node_modules"

# 1) sharp musl binaries — 17MB, not needed on glibc server
rm -rf "$STANDALONE_NM/@img/sharp-libvips-linuxmusl-x64" 2>/dev/null || true
rm -rf "$STANDALONE_NM/@img/sharp-libvips-linux-x64" 2>/dev/null || true
rm -rf "$STANDALONE_NM/sharp/build" 2>/dev/null || true

# 2) Next.js build cache + source maps
rm -rf .next/cache 2>/dev/null || true
rm -rf .next/standalone/.next/cache 2>/dev/null || true

# 3) node_modules caches
rm -rf "$STANDALONE_NM/.cache" 2>/dev/null || true

# 4) TypeScript type definitions (not needed at runtime)
find "$STANDALONE_NM" -name "*.d.ts" -delete 2>/dev/null || true
find "$STANDALONE_NM" -name "*.d.mts" -delete 2>/dev/null || true

# 5) Documentation
find "$STANDALONE_NM" -type d \( -name "doc" -o -name "docs" -o -name "example" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null || true

# 6) License/readme files
find "$STANDALONE_NM" -maxdepth 2 -name "*.md" -delete 2>/dev/null || true

# Create tarball from standalone output
cd .next/standalone
tar -czf /tmp/next-standalone.tar.gz .
cd ../..

# Check size
SIZE=$(du -m /tmp/next-standalone.tar.gz | cut -f1)
echo "Tarball size: ${SIZE}MB"

if [ "$SIZE" -gt 50 ]; then
  echo "ERROR: Tarball exceeds 50MB limit!"
  echo "Largest packages:"
  du -h "$STANDALONE_NM"/* 2>/dev/null | sort -rh | head -10
  exit 1
fi

echo "Build complete. Tarball ready at /tmp/next-standalone.tar.gz"
