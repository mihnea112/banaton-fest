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

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0]; // YYYY-MM-DD format
}

async function checkTicketValidForToday(
  orderItemId: string,
): Promise<{ valid: boolean; message?: string }> {
  const today = getTodayDate();

  const { data, error } = await supabase
    .from("order_item_days")
    .select(
      `
      event_day_id,
      event_days!inner(event_date)
    `,
    )
    .eq("order_item_id", orderItemId);

  if (error) throw error;

  // Check if any of the selected days match today
  const isValidForToday = data?.some((row: any) => {
    const eventDate = row.event_days?.event_date;
    return eventDate === today;
  });

  if (!isValidForToday) {
    return {
      valid: false,
      message: "Bilet nu este valabil pentru astazi.",
    };
  }

  return { valid: true };
}

function getNextStatus(
  currentStatus: string,
): "entered" | "exited" | "not_entered" {
  const status = String(currentStatus || "not_entered").toLowerCase();
  if (status === "not_entered") return "entered";
  if (status === "entered") return "exited";
  return "entered"; // exited → entered
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { qr?: string };
    const qr = typeof body.qr === "string" ? body.qr.trim() : "";
    if (!qr) return jsonError("Missing qr");

    const { data: ticket, error } = await supabase
      .from("issued_tickets")
      .select("id, ticket_number, status, current_status, order_item_id")
      .eq("qr_code_text", qr)
      .maybeSingle();

    if (error) throw error;
    if (!ticket) return jsonError("Bilet invalid", 404);

    // Check if ticket status is valid
    const status = String(ticket.status || "").toLowerCase();
    if (status && status !== "valid")
      return jsonError(`Status invalid: ${status}`, 409);

    // Check if ticket is valid for today
    const validForToday = await checkTicketValidForToday(ticket.order_item_id);
    if (!validForToday.valid) {
      return jsonError(validForToday.message || "Bilet nu este valabil", 409);
    }

    // Toggle status: not_entered → entered → exited → entered
    const nextStatus = getNextStatus(ticket.current_status);

    const { error: updErr } = await supabase
      .from("issued_tickets")
      .update({
        current_status: nextStatus,
        last_scanned_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (updErr) throw updErr;

    const statusMessage =
      nextStatus === "entered"
        ? "Intrare - Bun venit!"
        : "Iesire - La revedere!";

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number ?? null,
        status: nextStatus,
      },
      message: statusMessage,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message: msg } },
      { status: 500 },
    );
  }
}
