// app/api/auth/login/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function json(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function POST(req: Request) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) return json("Missing ADMIN_PASSWORD", 500);

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  if (password !== ADMIN_PASSWORD) return json("Parolă greșită", 401);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("banaton_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
