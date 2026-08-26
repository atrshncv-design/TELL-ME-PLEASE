import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { VerbBotProvider } from "@/components/VerbBot"
import { SoundToggle } from "@/components/SoundToggle"

// Playful rounded pairing (design/opendesign): Nunito for display/headings,
// Nunito Sans for body. Both ship full Cyrillic — the whole UI is in Russian.
// Шрифты захостены локально (src/fonts, OFL): next/font/google качал их с
// fonts.gstatic.com НА ЭТАПЕ СБОРКИ, и деплой-контейнер z.ai без внешней
// сети падал на этом каждый второй раз (деплой 26.08).
const nunito = localFont({
  src: "../fonts/Nunito.ttf",
  weight: "200 1000",
  variable: "--font-nunito",
  display: "swap",
})

const nunitoSans = localFont({
  src: "../fonts/NunitoSans.ttf",
  weight: "200 1000",
  variable: "--font-nunito-sans",
  display: "swap",
})

// Accent display face (design-boost, реш. 8): Unbounded — wide, playful,
// full Cyrillic. Rule «2–3 места на экран»: world names, XP digits only.
const unbounded = localFont({
  src: "../fonts/Unbounded.ttf",
  weight: "200 900",
  variable: "--font-unbounded",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TIME TRAVEL MISSION",
  description: "Интерактивная платформа для изучения английского языка",
}

// Mobile-first: the PRD entry point is a QR code scanned on a smartphone, so
// the page must render at device width (not desktop-zoomed). viewportFit cover
// lets content extend into notches/home-indicator safe areas. maximumScale is
// intentionally omitted so kids can still pinch-zoom for larger text (WCAG 1.4.4).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${nunito.variable} ${nunitoSans.variable} ${unbounded.variable} h-full`}>
      <body className="min-h-full bg-gradient-to-br from-primary-100 via-sky-50 to-listening-100 font-sans antialiased">
        <VerbBotProvider>{children}</VerbBotProvider>
        {/* Global sound toggle — fixed top-right corner (VerbBot is bottom). */}
        <SoundToggle />
      </body>
    </html>
  )
}
