import type { Metadata, Viewport } from "next";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { appUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Orion — Choose a template. Make it yours. Ship it.",
    template: "%s · Orion",
  },
  description:
    "Pick from thousands of hand-built templates, edit every word and image in a live visual editor, then download the static files or deploy to the web in one click.",
  keywords: [
    "website builder",
    "html templates",
    "static site generator",
    "website editor",
    "cloudflare pages deploy",
  ],
  authors: [{ name: "Orion" }],
  openGraph: {
    type: "website",
    siteName: "Orion",
    title: "Orion — Choose a template. Make it yours. Ship it.",
    description:
      "A template marketplace, visual editor and static site generator in one. Build a real website in minutes and take the files with you.",
    url: appUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Orion — Choose a template. Make it yours. Ship it.",
    description:
      "A template marketplace, visual editor and static site generator in one.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white antialiased">
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
