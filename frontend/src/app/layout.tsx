import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tell Me Please",
  description: "Interactive English learning platform for grades 5-9",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gradient-to-br from-violet-100 via-sky-50 to-amber-50 font-[family-name:var(--font-geist)]">
        {children}
      </body>
    </html>
  )
}
