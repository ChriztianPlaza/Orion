import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * `next build` and `next dev` both write to `.next`, so building while a dev
   * server is running corrupts its chunks — on Windows it also fights over the
   * Prisma engine DLL. Set NEXT_DIST_DIR to build into a separate directory
   * instead, e.g. `NEXT_DIST_DIR=.next-build npx next build`.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() {
    return [
      {
        // Rendered template output is sandboxed; allow embedding in our editor iframe only.
        source: "/api/render/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
