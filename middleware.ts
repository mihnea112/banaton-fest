// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/scan", "/admin"]; // auth-only

const LOCALE_COOKIE = "banaton_locale";
const SUPPORTED_LOCALES = ["ro", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // --- Locale handling (global) ---
  const queryLang = searchParams.get("lang");
  const cookieLang = req.cookies.get(LOCALE_COOKIE)?.value;

  // If the user hits any page with ?lang=en|ro, persist it to cookie and redirect
  // to the clean URL (removes the query param to avoid duplicate URLs for SEO).
  if (isLocale(queryLang)) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("lang");

    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, queryLang, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return res;
  }

  // If cookie is missing/invalid, set a default once.
  if (!isLocale(cookieLang)) {
    const res = NextResponse.next();
    res.cookies.set(LOCALE_COOKIE, "ro", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  // --- Admin auth protection (only for protected paths) ---
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const authed = req.cookies.get("banaton_admin")?.value === "1";
  if (authed) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/auth";
  url.searchParams.set("next", req.nextUrl.pathname + (req.nextUrl.search || ""));
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all app pages so locale cookie is always available,
  // but exclude Next internals + static files + API.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
