// app/api/stripe/checkout-session/route.ts
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars for service role client.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toPositiveInt(value: number, fallback = 1): number {
  const n = Math.floor(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function toStripeAmount(valueRon: number): number {
  const amount = Math.round(toNumber(valueRon) * 100);
  return amount > 0 ? amount : 0;
}

async function getBaseUrlFromRequest() {
  const h = await headers();
  const proto =
    h.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host)
    return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
  return `${proto}://${host}`;
}

type PublicOrderItem = Record<string, any>;
type PublicOrder = Record<string, any>;

function extractOrderFromApiPayload(payload: unknown): PublicOrder | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, any>;
  return (root.order ?? root.data ?? root) as PublicOrder;
}

function getOrderItems(order: PublicOrder): PublicOrderItem[] {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.order_items)) return order.order_items;
  return [];
}

function getOrderTotal(order: PublicOrder): number {
  return (
    toNumber(order.totalAmount) ||
    toNumber(order.total_amount) ||
    toNumber(order.total_ron) ||
    toNumber(order.amount_total) ||
    toNumber(order.amount) ||
    toNumber(order.subtotal_ron) ||
    toNumber(order.subtotal) ||
    toNumber(order.final_total) ||
    toNumber(order.final_price) ||
    toNumber(order.gross_total) ||
    0
  );
}

function buildLineItemsFromOrderItems(
  items: PublicOrderItem[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const item of items) {
    const qty = toPositiveInt(
      toNumber(item.qty ?? item.quantity ?? item.count ?? item.seats ?? 1),
      1,
    );

    const pricing =
      item.pricing && typeof item.pricing === "object"
        ? item.pricing
        : undefined;

    const unitPriceRon =
      toNumber(
        item.unitPrice ??
          item.unit_price ??
          item.price_per_unit ??
          item.amount_per_unit ??
          item.unit_amount ??
          pricing?.unitPrice ??
          pricing?.unit_price ??
          pricing?.unit_amount,
      ) || toNumber(item.price ?? pricing?.price);

    const lineTotalRon =
      toNumber(
        item.totalPrice ??
          item.lineTotal ??
          item.line_total ??
          item.total ??
          item.itemTotal ??
          item.total_amount ??
          item.amount_total ??
          item.amount ??
          pricing?.totalPrice ??
          pricing?.lineTotal ??
          pricing?.line_total ??
          pricing?.total ??
          pricing?.amount,
      ) || 0;

    const fallbackUnitRon =
      unitPriceRon > 0
        ? unitPriceRon
        : qty > 0 && lineTotalRon > 0
          ? lineTotalRon / qty
          : 0;

    const unitAmount = toStripeAmount(fallbackUnitRon);
    if (unitAmount <= 0) continue;

    const categoryRaw = String(
      item.category ?? item.ticket_category ?? item.access_type ?? "general",
    ).toLowerCase();
    const categoryLabel = categoryRaw === "vip" ? "VIP" : "Acces General";

    const displayName =
      item.name ||
      item.label ||
      item.ticket_name ||
      item.product_name ||
      item.product_name_snapshot ||
      item.title ||
      "Bilet";

    const variant = item.variantLabel ?? item.variant_label ?? null;
    const duration = item.durationLabel ?? item.duration_label ?? null;
    const details = [variant, duration].filter(Boolean).join(" · ");

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "ron",
        unit_amount: unitAmount,
        product_data: {
          name: `${categoryLabel} - ${displayName}`,
          ...(details ? { description: details } : {}),
        },
      },
    });
  }

  return lineItems;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Lipsește STRIPE_SECRET_KEY." },
        { status: 500 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // Optional customer data coming from Checkout form
    // GDPR: we collect only email + phone in our UI. Everything else may come from Stripe,
    // but email MUST always be the one from our form.
    const customerObj =
      body.customer && typeof body.customer === "object"
        ? (body.customer as Record<string, unknown>)
        : null;

    // Accept multiple shapes defensively
    const customerEmail = asString(
      customerObj?.email ??
        (body as any).customer_email ??
        (body as any).email ??
        (body as any).customerEmail,
    );

    const customerPhone = asString(
      customerObj?.phone ??
        (body as any).customer_phone ??
        (body as any).phone ??
        (body as any).customerPhone,
    );

    // Require email + phone from our checkout form (GDPR choice)
    if (!customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: "Te rog completează email și număr de telefon pentru a continua." },
        { status: 400 },
      );
    }

    const orderToken =
      (typeof body.orderToken === "string" && body.orderToken) ||
      (typeof body.token === "string" && body.token) ||
      (typeof body.publicToken === "string" && body.publicToken) ||
      req.nextUrl.searchParams.get("token") ||
      null;

    if (!orderToken) {
      return NextResponse.json(
        { error: "Lipsește tokenul comenzii." },
        { status: 400 },
      );
    }

    const baseUrl = await getBaseUrlFromRequest();
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Nu pot determina base URL." },
        { status: 500 },
      );
    }

    const orderRes = await fetch(
      `${baseUrl}/api/order/public?token=${encodeURIComponent(orderToken)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );

    if (!orderRes.ok) {
      return NextResponse.json(
        { error: `Nu am putut încărca comanda (${orderRes.status}).` },
        { status: 400 },
      );
    }

    const orderPayload = (await orderRes.json()) as unknown;
    const order = extractOrderFromApiPayload(orderPayload);
    if (!order) {
      return NextResponse.json(
        { error: "Răspuns invalid de la /api/order/public." },
        { status: 500 },
      );
    }

    const items = getOrderItems(order);
    if (!items.length) {
      return NextResponse.json(
        { error: "Comanda nu conține produse." },
        { status: 400 },
      );
    }

    let lineItems = buildLineItemsFromOrderItems(items);

    if (!lineItems.length) {
      const totalRon = getOrderTotal(order);
      const totalBani = toStripeAmount(totalRon);
      if (totalBani <= 0) {
        return NextResponse.json(
          { error: "Comanda nu are total valid." },
          { status: 400 },
        );
      }

      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: "ron",
            unit_amount: totalBani,
            product_data: {
              name: "Banaton Fest 2026 - Comandă bilete",
              description: `Comandă publică ${orderToken}`,
            },
          },
        },
      ];
    }

    const successUrl = `${baseUrl}/success?order=${encodeURIComponent(orderToken)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout?order=${encodeURIComponent(orderToken)}`;

    const metadata: Record<string, string> = {
      order_token: orderToken,
    };

    if (typeof order.id === "string" && order.id) metadata.order_id = order.id;

    // Mirror ONLY the form email/phone into Stripe metadata so webhook can always recover it.
    // IMPORTANT: In our system, customer_email must always be the one from the form (not Stripe).
    if (customerEmail) {
      metadata.customer_email = customerEmail;
      // extra compatibility in case some code reads camelCase
      metadata.customerEmail = customerEmail;
    }
    if (customerPhone) {
      metadata.customer_phone = customerPhone;
      metadata.customerPhone = customerPhone;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: orderToken,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      metadata,
      payment_intent_data: { metadata },
      customer_creation: "if_required",
      // Prefill Stripe Checkout email with OUR form email.
      // User may still change it in Stripe UI; webhook will ignore Stripe email and use metadata instead.
      customer_email: customerEmail,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe nu a returnat URL-ul." },
        { status: 500 },
      );
    }

    // ✅ Persist mapping in DB immediately
    const supabase = getSupabaseAdmin();

    const patch: Record<string, unknown> = {
      payment_provider: "stripe",
      payment_status: "pending",
      payment_reference: session.id,
      payment_provider_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      updated_at: new Date().toISOString(),
    };

    console.log("[checkout-session] form contact", {
      orderToken,
      customerEmail,
      customerPhone,
      stripeSessionId: session.id,
    });

    // Persist ONLY what we collect in the checkout form (never Stripe email)
    if (customerEmail) patch.customer_email = customerEmail;
    if (customerPhone) patch.customer_phone = customerPhone;

    const { error: updErr } = await supabase
      .from("orders")
      .update(patch)
      .eq("public_token", orderToken);

    if (updErr) {
      console.error("[checkout-session] failed to persist order pre-payment data", updErr);
      // Don’t block checkout creation, but you want to know about it.
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[POST /api/stripe/checkout-session] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Eroare internă Stripe.",
      },
      { status: 500 },
    );
  }
}
