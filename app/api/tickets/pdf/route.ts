// app/api/tickets/pdf/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl)
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL");
if (!supabaseServiceRoleKey)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type DbTicket = {
  id: string;
  ticket_number: number | null;
  qr_code_text: string | null;
  status: string | null;
  order_item_id: string | null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = asString(url.searchParams.get("token"));
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, public_token, status, payment_status, customer_first_name, customer_last_name, customer_email",
      )
      .eq("public_token", token)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { data: tickets, error: tErr } = await supabase
      .from("issued_tickets")
      .select("id, ticket_number, qr_code_text, status, order_item_id")
      .eq("order_id", order.id)
      .order("ticket_number", { ascending: true });

    if (tErr) throw tErr;

    const list = (tickets ?? []) as DbTicket[];
    if (!list.length) {
      return NextResponse.json(
        { error: "No issued tickets for this order yet" },
        { status: 404 },
      );
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const buyerName = [order.customer_first_name, order.customer_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    for (const t of list) {
      const page = pdf.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      // Header
      page.drawText("Banaton Fest 2026", {
        x: 50,
        y: height - 70,
        size: 22,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText("Bilet electronic", {
        x: 50,
        y: height - 100,
        size: 14,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });

      // Ticket meta
      const ticketNo = t.ticket_number ?? 0;
      page.drawText(`Ticket #${ticketNo}`, {
        x: 50,
        y: height - 150,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (buyerName) {
        page.drawText(`Nume: ${buyerName}`, {
          x: 50,
          y: height - 180,
          size: 12,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      if (order.customer_email) {
        page.drawText(`Email: ${order.customer_email}`, {
          x: 50,
          y: height - 200,
          size: 12,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      // QR (generate PNG buffer)
      const qrText = t.qr_code_text || `banaton:${token}:${t.id}`;
      const pngDataUrl = await QRCode.toDataURL(qrText, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 380,
      });

      const pngBytes = Buffer.from(pngDataUrl.split(",")[1]!, "base64");
      const png = await pdf.embedPng(pngBytes);

      // Draw QR
      const qrSize = 260;
      page.drawImage(png, {
        x: width - qrSize - 60,
        y: height - qrSize - 160,
        width: qrSize,
        height: qrSize,
      });

      // Footer note
      page.drawText("Prezintă acest cod QR la intrare.", {
        x: 50,
        y: 90,
        size: 12,
        font,
        color: rgb(0.25, 0.25, 0.25),
      });

      page.drawText(`Order token: ${token}`, {
        x: 50,
        y: 65,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="banaton-tickets-${token}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[GET /api/tickets/pdf] error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
