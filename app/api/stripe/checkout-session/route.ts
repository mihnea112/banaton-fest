// app/api/stripe/checkout-session/route.ts
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

type PublicOrderItem = {
  id?: string;
  qty?: number;
  quantity?: number;
  count?: number;
  seats?: number;

  category?: string;
  ticket_category?: string;
  access_type?: string;

  name?: string;
  label?: string;
  title?: string;
  ticket_name?: string;
  product_name?: string;
  product_name_snapshot?: string;

  variantLabel?: string | null;
  variant_label?: string | null;

  durationLabel?: string;
  duration_label?: string;

  canonical_day_set?: string;

  price?: number | string;
  unitPrice?: number | string;
  unit_price?: number | string;
  price_per_unit?: number | string;
  amount_per_unit?: number | string;
  unit_amount?: number | string;

  totalPrice?: number | string;
  lineTotal?: number | string;
  line_total?: number | string;
  total?: number | string;
  itemTotal?: number | string;
  total_amount?: number | string;
  amount_total?: number | string;
  amount?: number | string;

  pricing?: {
    price?: number | string;
    unitPrice?: number | string;
    unit_price?: number | string;
    unit_amount?: number | string;
    totalPrice?: number | string;
    lineTotal?: number | string;
    line_total?: number | string;
    total?: number | string;
    amount?: number | string;
  };
};

type PublicOrder = {
  id?: string;
  publicToken?: string;
  public_token?: string;
  token?: string;
  status?: string | null;
  currency?: string;

  totalAmount?: number | string;
  total_amount?: number | string;
  total_ron?: number | string;
  amount_total?: number | string;
  amount?: number | string;
  subtotal?: number | string;
  subtotal_ron?: number | string;
  final_total?: number | string;
  final_price?: number | string;
  gross_total?: number | string;

  items?: PublicOrderItem[];
  order_items?: PublicOrderItem[];
};

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
  // Stripe expects the smallest currency unit (bani for RON)
  const amount = Math.round(toNumber(valueRon) * 100);
  return amount > 0 ? amount : 0;
}

async function getBaseUrlFromRequest() {
  const h = await headers();
  const proto =
    h.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const host = h.get("x-forwarded-host") || h.get("host");

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
  }

  return `${proto}://${host}`;
}

function extractOrderFromApiPayload(payload: unknown): PublicOrder | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const candidate =
    (root.order as PublicOrder | undefined) ??
    (root.data as PublicOrder | undefined) ??
    (root as PublicOrder);

  if (!candidate || typeof candidate !== "object") return null;
  return candidate;
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

    const orderToken =
      (typeof body.orderToken === "string" && body.orderToken) ||
      (typeof body.token === "string" && body.token) ||
      (typeof body.publicToken === "string" && body.publicToken) ||
      (typeof req.nextUrl.searchParams.get("token") === "string" &&
        req.nextUrl.searchParams.get("token")) ||
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
        { error: "Nu pot determina URL-ul aplicației (base URL)." },
        { status: 500 },
      );
    }

    // Refolosim endpointul public existent ca source of truth
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

    const lineItems = buildLineItemsFromOrderItems(items);

    // fallback safety: dacă ceva nu are preț pe iteme, pune o singură linie din total
    if (!lineItems.length) {
      const totalRon = getOrderTotal(order);
      const totalBani = toStripeAmount(totalRon);

      if (totalBani <= 0) {
        return NextResponse.json(
          { error: "Comanda nu are un total valid pentru plată." },
          { status: 400 },
        );
      }

      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "ron",
          unit_amount: totalBani,
          product_data: {
            name: "Banaton Fest 2026 - Comandă bilete",
            description: `Comandă publică ${orderToken}`,
          },
        },
      });
    }

    // Success/cancel pages (ajustează dacă vrei alte rute)
    const successUrl = `${baseUrl}/success?order=${encodeURIComponent(orderToken)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout?order=${encodeURIComponent(orderToken)}`;

    // Optional metadata
    const metadata: Record<string, string> = {
      order_token: orderToken,
    };

    const publicTokenFromApi =
      (typeof order.publicToken === "string" && order.publicToken) ||
      (typeof order.public_token === "string" && order.public_token) ||
      null;

    if (publicTokenFromApi) metadata.public_order_token = publicTokenFromApi;
    if (typeof order.id === "string" && order.id) metadata.order_id = order.id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      currency: "ron",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      metadata,
      // Dacă vrei să apară și pe PaymentIntent:
      payment_intent_data: {
        metadata,
      },
      // Poți activa email collection din Stripe hosted checkout
      customer_creation: "if_required",
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe nu a returnat URL-ul de checkout." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[POST /api/stripe/checkout-session] error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Eroare internă la crearea sesiunii Stripe.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
