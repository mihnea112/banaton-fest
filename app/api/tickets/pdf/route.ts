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

function pdfSafeText(input: unknown): string {
  const s = typeof input === "string" ? input : String(input ?? "");
  // Remove diacritics (ăâîșț etc.) so StandardFonts (WinAnsi) can encode.
  // Also normalize a few edge cases that might not decompose as expected.
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ș/g, "s")
    .replace(/Ș/g, "S")
    .replace(/ț/g, "t")
    .replace(/Ț/g, "T");
}

// --- PDF theme (match site vibe) ---
const THEME = {
  bg: rgb(0.101, 0.043, 0.180), // ~ #1A0B2E
  panel: rgb(0.141, 0.071, 0.243), // ~ #24123E
  panel2: rgb(0.176, 0.106, 0.306), // ~ #2D1B4E
  border: rgb(0.263, 0.173, 0.478), // ~ #432C7A
  cyan: rgb(0.0, 0.898, 1.0), // ~ #00E5FF
  purple: rgb(0.486, 0.302, 1.0), // ~ #7C4DFF
  gold: rgb(1.0, 0.843, 0.0), // ~ #FFD700
  text: rgb(0.95, 0.95, 0.98),
  muted: rgb(0.702, 0.616, 0.859), // ~ #B39DDB
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

type RGBLike = {
  r?: number;
  g?: number;
  b?: number;
  red?: number;
  green?: number;
  blue?: number;
};

function rgbParts(c: unknown): { r: number; g: number; b: number } {
  const cc = (c ?? {}) as RGBLike;
  const r = Number.isFinite(cc.r as number)
    ? (cc.r as number)
    : Number.isFinite(cc.red as number)
      ? (cc.red as number)
      : 0;
  const g = Number.isFinite(cc.g as number)
    ? (cc.g as number)
    : Number.isFinite(cc.green as number)
      ? (cc.green as number)
      : 0;
  const b = Number.isFinite(cc.b as number)
    ? (cc.b as number)
    : Number.isFinite(cc.blue as number)
      ? (cc.blue as number)
      : 0;

  return { r: clamp01(r), g: clamp01(g), b: clamp01(b) };
}

function mix(
  a: ReturnType<typeof rgb>,
  b: ReturnType<typeof rgb>,
  t: number,
): ReturnType<typeof rgb> {
  const tt = clamp01(Number.isFinite(t) ? t : 0);
  const A = rgbParts(a);
  const B = rgbParts(b);
  return rgb(
    clamp01(A.r + (B.r - A.r) * tt),
    clamp01(A.g + (B.g - A.g) * tt),
    clamp01(A.b + (B.b - A.b) * tt),
  );
}

function drawGradientBand(page: any, x: number, y: number, w: number, h: number, from: ReturnType<typeof rgb>, to: ReturnType<typeof rgb>) {
  // simple horizontal gradient via thin strips
  const steps = 48;
  const stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    const c = mix(from, to, i / (steps - 1));
    page.drawRectangle({ x: x + i * stepW, y, width: stepW + 0.5, height: h, color: c });
  }
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

async function tryFetchLogo(origin: string): Promise<
  | { bytes: Uint8Array; kind: "png" | "jpg" }
  | null
> {
  // Single source of truth: public/images/logo.png
  const path = "/images/logo.png";

  try {
    const res = await fetch(`${origin}${path}`, { cache: "no-store" });
    if (!res.ok) return null;

    const buf = new Uint8Array(await res.arrayBuffer());
    return { bytes: buf, kind: "png" };
  } catch {
    return null;
  }
}

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

    const origin = new URL(req.url).origin;

    // Try to load logo from public/images/logo.png. If not found, continue without it.
    const logoAsset = await tryFetchLogo(origin);
    const logoImage = logoAsset
      ? logoAsset.kind === "png"
        ? await pdf.embedPng(logoAsset.bytes)
        : await pdf.embedJpg(logoAsset.bytes)
      : null;

    const buyerName = pdfSafeText(
      [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ")
        .trim(),
    );

    for (const t of list) {
      const page = pdf.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      // Full-page background
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: THEME.bg,
      });

      // Top glow gradient band
      // REMOVED: drawGradientBand(page, 0, height - 110, width, 110, mix(THEME.cyan, THEME.bg, 0.65), mix(THEME.purple, THEME.bg, 0.65));

      // Simple header
      page.drawText(pdfSafeText("Banaton Fest 2026"), {
        x: 40,
        y: height - 70,
        size: 22,
        font: fontBold,
        color: THEME.text,
      });

      if (logoImage) {
        const maxLogoW = 140;
        const maxLogoH = 46;
        const s = Math.min(maxLogoW / logoImage.width, maxLogoH / logoImage.height, 1);
        const w = logoImage.width * s;
        const h = logoImage.height * s;

        page.drawImage(logoImage, {
          x: width - 36 - w,
          y: height - 78 - (h - 22) / 2,
          width: w,
          height: h,
          opacity: 0.98,
        });
      }

      // Subtle divider line
      page.drawRectangle({
        x: 36,
        y: height - 86,
        width: width - 72,
        height: 1,
        color: mix(THEME.border, THEME.bg, 0.35),
      });

      // Main content panel
      page.drawRectangle({
        x: 36,
        y: height - 500,
        width: width - 72,
        height: 330,
        color: THEME.panel,
        borderColor: THEME.border,
        borderWidth: 1,
      });

      // Subtle accent line
      page.drawRectangle({
        x: 36,
        y: height - 500,
        width: 4,
        height: 330,
        color: mix(THEME.cyan, THEME.panel, 0.7),
      });

      // Ticket meta
      const ticketNo = t.ticket_number ?? 0;
      page.drawText(pdfSafeText(`Ticket #${ticketNo}`), {
        x: 54,
        y: height - 230,
        size: 18,
        font: fontBold,
        color: THEME.text,
      });

      if (buyerName) {
        page.drawText(pdfSafeText(`Nume: ${buyerName}`), {
          x: 54,
          y: height - 260,
          size: 12,
          font,
          color: THEME.muted,
        });
      }

      if (order.customer_email) {
        page.drawText(pdfSafeText(`Email: ${order.customer_email}`), {
          x: 54,
          y: height - 280,
          size: 12,
          font,
          color: THEME.muted,
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

      const qrSize = 220;
      const qrCardX = width - qrSize - 60;
      const qrCardY = height - qrSize - 260;

      // Minimal QR border
      page.drawRectangle({
        x: qrCardX - 6,
        y: qrCardY - 6,
        width: qrSize + 12,
        height: qrSize + 12,
        borderColor: mix(THEME.border, THEME.bg, 0.2),
        borderWidth: 1,
        color: rgb(1, 1, 1),
        opacity: 0.03,
      });

      // Draw QR
      page.drawImage(png, {
        x: qrCardX,
        y: qrCardY,
        width: qrSize,
        height: qrSize,
      });

      // Footer divider
      page.drawRectangle({
        x: 36,
        y: 112,
        width: width - 72,
        height: 1,
        color: mix(THEME.border, THEME.bg, 0.35),
      });

      // Footer note
      page.drawText(pdfSafeText("Prezinta acest cod QR la intrare."), {
        x: 36,
        y: 92,
        size: 12,
        font,
        color: THEME.muted,
      });

      page.drawText(pdfSafeText(`Order token: ${token}`), {
        x: 36,
        y: 72,
        size: 9,
        font,
        color: THEME.muted,
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
