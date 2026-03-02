// app/sitemap.xml/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl() {
  // your domain requirement
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://banaton-fest.vercel.app"
  );
}

function xmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const url = baseUrl();

  // add only the routes you actually have
  const routes = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/tickets", changefreq: "daily", priority: "0.9" },
    { path: "/vip", changefreq: "weekly", priority: "0.7" },
    { path: "/checkout", changefreq: "weekly", priority: "0.6" },
  ] as const;

  const now = new Date().toISOString();

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    routes
      .map(
        (r) =>
          `<url>` +
          `<loc>${xmlEscape(url + r.path)}</loc>` +
          `<lastmod>${now}</lastmod>` +
          `<changefreq>${r.changefreq}</changefreq>` +
          `<priority>${r.priority}</priority>` +
          `</url>`,
      )
      .join("") +
    `</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
