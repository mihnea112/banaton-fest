// app/sitemap.xml/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "https://banaton-fest.vercel.app";

  const now = new Date().toISOString();

  const routes = ["/", "/tickets", "/vip", "/checkout"];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    routes
      .map(
        (p) =>
          `<url>` +
          `<loc>${base}${p}</loc>` +
          `<lastmod>${now}</lastmod>` +
          `</url>`,
      )
      .join("") +
    `</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
