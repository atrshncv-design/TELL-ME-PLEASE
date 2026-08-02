import type { Metadata, Viewport } from "next"
import { Nunito, Nunito_Sans, Unbounded } from "next/font/google"
import "./globals.css"
import { VerbBotProvider } from "@/components/VerbBot"

// Playful rounded pairing (design/opendesign): Nunito for display/headings,
// Nunito Sans for body. Both ship full Cyrillic — the whole UI is in Russian.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

// Accent display face (design-boost, реш. 8): Unbounded — wide, playful,
// full Cyrillic. Rule «2–3 места на экран»: world names, XP digits only.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Tell Me Please",
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
      </body>
    </html>
  )
}
