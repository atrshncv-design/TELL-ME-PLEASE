import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: 'standalone',
  // Деплой на space.z-ai: лимит тарболла 50MB. File-tracing затягивал в
  // standalone каталоги платформенного шаблона (skills/ — 61MB SDK) и вложенный
  // клон репозитория (tell-me-please/), раздувая пакет до 61MB → деплой падал.
  // Исключаем их из трассировки (на рантайм приложения не влияют).
  outputFileTracingExcludes: {
    '/**': [
      './skills/**',
      './tell-me-please/**',
      './examples/**',
      './node_modules/.cache/**',
    ],
  },
}

export default nextConfig
