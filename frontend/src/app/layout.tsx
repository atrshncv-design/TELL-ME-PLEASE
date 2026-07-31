import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { VerbBotProvider } from "@/components/VerbBot"

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tell Me Please",
  description: "Interactive English learning platform for grades 5-9",
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
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gradient-to-br from-primary-100 via-sky-50 to-listening-100 font-[family-name:var(--font-geist)]">
        <VerbBotProvider>{children}</VerbBotProvider>
      </body>
    </html>
  )
}
