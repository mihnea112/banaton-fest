// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/scan", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const authed = req.cookies.get("banaton_admin")?.value === "1";
  if (authed) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/auth";
  url.searchParams.set("next", pathname + (search || ""));
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/scan/:path*", "/admin/:path*"],
};
