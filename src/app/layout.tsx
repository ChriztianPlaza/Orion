import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { appUrl } from "@/lib/env";
import "./globals.css";

/*
 * Self-hosted by next/font at build time — no external request, no FOIT, and
 * the metrics are known ahead of time so nothing shifts as it loads.
 *
 * The old stack led with "SF Pro Display", which only exists on Apple devices;
 * everywhere else it silently fell through to Segoe UI or Roboto, which is why
 * the same page looked flat on Windows and sharp on a Mac.
 */
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Orion — Choose a template. Make it yours. Ship it.",
    template: "%s · Orion",
  },
  description:
    "Pick from hundreds of hand-built templates, edit every word and image in a live visual editor, then download the static files and host them anywhere for free.",
  keywords: [
    "website builder",
    "html templates",
    "static site generator",
    "website editor",
    "free website hosting",
  ],
  authors: [{ name: "Orion" }],
  openGraph: {
    type: "website",
    siteName: "Orion",
    title: "Orion — Choose a template. Make it yours. Ship it.",
    description:
      "A template library, visual editor and static site generator in one. Build a real website in minutes and take the files with you.",
    url: appUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Orion — Choose a template. Make it yours. Ship it.",
    description:
      "A template library, visual editor and static site generator in one.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black"
        >
          Skip to content
        </a>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
