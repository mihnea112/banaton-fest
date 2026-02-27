import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { qr?: string };
    const qr = typeof body.qr === "string" ? body.qr.trim() : "";
    if (!qr) return jsonError("Missing qr");

    const { data: ticket, error } = await supabase
      .from("issued_tickets")
      .select("id, ticket_number, status")
      .eq("qr_code_text", qr)
      .maybeSingle();

    if (error) throw error;
    if (!ticket) return jsonError("Ticket invalid", 404);

    const status = String(ticket.status || "").toLowerCase();
    if (status === "checked_in")
      return jsonError("Deja folosit (checked-in)", 409);
    if (status && status !== "valid")
      return jsonError(`Status invalid: ${status}`, 409);

    const { error: updErr } = await supabase
      .from("issued_tickets")
      .update({ status: "checked_in" })
      .eq("id", ticket.id);

    if (updErr) throw updErr;

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number ?? null,
        status: "checked_in",
      },
      message: "OK",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message: msg } },
      { status: 500 },
    );
  }
}
