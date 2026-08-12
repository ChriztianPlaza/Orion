import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/templates", "/pricing"],
        disallow: ["/api/", "/admin", "/dashboard", "/editor", "/account", "/login", "/register"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
