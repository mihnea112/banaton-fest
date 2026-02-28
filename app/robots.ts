// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Keep this as your canonical public origin while you're on Vercel.
  const site = "https://banaton-fest.vercel.app";

  return {
    // Helpful for crawlers that read it
    host: site,

    // Index the public marketing pages, block everything private/transactional.
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tickets", "/vip", "/program", "/contact"],
        disallow: [
          "/api",
          "/checkout",
          "/success",
          "/admin",
          "/scan",
          "/auth",
          "/_next",
        ],
      },
    ],

    // Make sure you actually serve this route at /sitemap.xml
    sitemap: `${site}/sitemap.xml`,
  };
}
