#!/bin/bash
set -e

# z.ai build script — standalone Next.js for space.z-ai platform
# Platform passes BUILD_ID env var and expects tarball at /tmp/build_fullstack_${BUILD_ID}.tar.gz
# Platform expects structure: ./start.sh, ./next-service-dist/, ./Caddyfile

cd frontend

# Install dependencies
npm ci --loglevel=error 2>&1

# Build standalone
npm run build 2>&1

# Create staging directory
STAGING="/tmp/build_staging"
rm -rf "$STAGING"
mkdir -p "$STAGING/next-service-dist"

# Copy standalone output into next-service-dist/
cp -r .next/standalone/* "$STAGING/next-service-dist/"
cp -r .next/standalone/.next "$STAGING/next-service-dist/.next" 2>/dev/null || true

# Copy static assets
cp -r .next/standalone/.next/static "$STAGING/next-service-dist/.next/static" 2>/dev/null || true
cp -r public "$STAGING/next-service-dist/public" 2>/dev/null || true

# Trim musl binaries (17MB, not needed on glibc)
STANDALONE_NM="$STAGING/next-service-dist/node_modules"
rm -rf "$STANDALONE_NM/@img/sharp-libvips-linuxmusl-x64" 2>/dev/null || true
rm -rf "$STANDALONE_NM/@img/sharp-libvips-linux-x64" 2>/dev/null || true
rm -rf "$STANDALONE_NM/sharp/build" 2>/dev/null || true

# Trim caches + docs + type definitions
rm -rf "$STAGING/next-service-dist/.next/cache" 2>/dev/null || true
rm -rf "$STANDALONE_NM/.cache" 2>/dev/null || true
find "$STANDALONE_NM" -name "*.d.ts" -delete 2>/dev/null || true
find "$STANDALONE_NM" -name "*.d.mts" -delete 2>/dev/null || true
find "$STANDALONE_NM" -type d \( -name "doc" -o -name "docs" -o -name "example" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null || true
find "$STANDALONE_NM" -maxdepth 2 -name "*.md" -delete 2>/dev/null || true

# Trim platform-template dirs that file-tracing may sweep in (деплой 24.08:
# тарболл 61MB > лимита 50MB — skills/ 61MB + вложенный клон репо 8.9MB).
# Приложение их не использует; страховка поверх outputFileTracingExcludes.
rm -rf "$STAGING/next-service-dist/skills" 2>/dev/null || true
rm -rf "$STAGING/next-service-dist/tell-me-please" 2>/dev/null || true
rm -rf "$STAGING/next-service-dist/examples" 2>/dev/null || true

# Copy Caddyfile to staging root
cp ../Caddyfile "$STAGING/Caddyfile" 2>/dev/null || true

# Copy .env if exists (platform expects it in tarball)
cp ../.env "$STAGING/next-service-dist/.env" 2>/dev/null || true
cp ../.env "$STAGING/.env" 2>/dev/null || true

# Copy start.sh to staging root
cat > "$STAGING/start.sh" << 'STARTEOF'
#!/bin/bash
set -e
# Путь — относительно самого скрипта: платформа может распаковать тарболл
# не в /home/z/my-project (абсолютный путь давал тихий fallback до заглушки Z).
cd "$(cd "$(dirname "$0")" && pwd)/next-service-dist"
if [ -f .env ]; then
  set -a; source .env; set +a
fi
PORT=3000 HOSTNAME=0.0.0.0 exec node server.js
STARTEOF
chmod +x "$STAGING/start.sh"

# Create tarball at platform-expected path
TARBALL="/tmp/build_fullstack_${BUILD_ID}.tar.gz"
cd "$STAGING"
tar -czf "$TARBALL" .
cd /tmp
rm -rf "$STAGING"

# Verify
SIZE=$(du -m "$TARBALL" | cut -f1)
echo "Tarball: $TARBALL (${SIZE}MB)"

if [ "$SIZE" -gt 50 ]; then
  echo "ERROR: Tarball exceeds 50MB limit!"
  exit 1
fi

echo "Build complete."
