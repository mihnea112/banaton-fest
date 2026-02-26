// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function requireEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

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

type OrderStatusPatch = {
  status?: string;
  payment_status?: string;
  paid_at?: string | null;
  payment_failed_at?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_event_id_last?: string | null;
  payment_provider?: string | null;
  payment_method_type?: string | null;
  failure_reason?: string | null;
  updated_at?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getPaymentIntentId(
  value: string | Stripe.PaymentIntent | null,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

function getOrderTokenFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  const md = session.metadata || {};
  return (
    asString(md.orderToken) ||
    asString(md.order_token) ||
    asString(md.token) ||
    asString(md.publicToken) ||
    asString(md.public_order_token) ||
    null
  );
}

function getOrderIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  const md = session.metadata || {};
  return asString(md.orderId) || asString(md.order_id) || null;
}

async function updateOrderByTokenOrId(params: {
  orderToken?: string | null;
  orderId?: string | null;
  patch: OrderStatusPatch;
}) {
  const { orderToken, orderId, patch } = params;

  let query = supabase.from("orders").update({
    ...patch,
    updated_at: nowIso(),
  });

  if (orderId) query = query.eq("id", orderId);
  else if (orderToken) query = query.eq("public_token", orderToken);
  else throw new Error("No order identifier found (orderId/orderToken)");

  const { data, error } = await query
    .select(
      "id, public_token, status, payment_status, customer_full_name, billing_name, customer_email",
    )
    .maybeSingle();

  if (error) throw error;
  if (!data)
    throw new Error(
      `Order not found for ${orderId ? `id=${orderId}` : `public_token=${orderToken}`}`,
    );

  return data as {
    id: string;
    public_token: string;
    status: string | null;
    payment_status: string | null;
    customer_full_name?: string | null;
    billing_name?: string | null;
    customer_email?: string | null;
  };
}

function toInt(value: unknown, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * EMITERE BILETE (issued_tickets)
 * Idempotent: dacă există deja bilete pentru order_id -> nu mai emite.
 */
async function issueTicketsIfMissing(params: {
  orderId: string;
  orderToken: string;
  attendeeName?: string | null;
}) {
  const { orderId, orderToken, attendeeName } = params;

  // 1) check already issued
  const { data: existing, error: existingErr } = await supabase
    .from("issued_tickets")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);

  if (existingErr) throw existingErr;
  if (existing && existing.length > 0) {
    console.log("[tickets] already issued for order, skipping", { orderId });
    return;
  }

  // 2) load items
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select(
      "id, order_id, category, qty, quantity, seats, tickets_count, name, label, product_name_snapshot",
    )
    .eq("order_id", orderId);

  if (itemsErr) throw itemsErr;
  if (!items || items.length === 0) {
    console.warn("[tickets] no order_items found, cannot issue tickets", {
      orderId,
    });
    return;
  }

  // 3) build inserts
  const rows: Array<{
    order_id: string;
    order_item_id: string;
    qr_code_text: string;
    attendee_name: string | null;
    status: string;
    created_at: string;
  }> = [];

  for (const it of items as any[]) {
    const qty = Math.max(
      1,
      toInt(it.qty ?? it.quantity ?? it.seats ?? it.tickets_count ?? 1, 1),
    );

    const displayName =
      it.name ?? it.label ?? it.product_name_snapshot ?? "Bilet";

    for (let i = 1; i <= qty; i++) {
      // qr_code_text: unic + util la scan
      // include token, order_item_id, index
      const qr = `banaton:${orderToken}:${it.id}:${i}`;

      rows.push({
        order_id: orderId,
        order_item_id: it.id,
        qr_code_text: qr,
        attendee_name: attendeeName ?? null,
        status: "valid",
        created_at: nowIso(),
      });
    }

    console.log("[tickets] prepared tickets", {
      orderId,
      orderItemId: it.id,
      displayName,
      qty,
    });
  }

  // 4) insert in batches (safe for serverless)
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error: insErr } = await supabase
      .from("issued_tickets")
      .insert(slice);
    if (insErr) throw insErr;
  }

  console.log("[tickets] issued tickets inserted", {
    orderId,
    count: rows.length,
  });
}

async function handlePaidOrder(params: {
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
}) {
  const { event, session } = params;

  const orderToken = getOrderTokenFromSession(session);
  const orderIdFromMeta = getOrderIdFromSession(session);

  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);

  const paymentMethodType =
    Array.isArray(session.payment_method_types) &&
    session.payment_method_types.length > 0
      ? session.payment_method_types[0]
      : null;

  const isPaid = session.payment_status === "paid";

  // 1) update order
  const updated = await updateOrderByTokenOrId({
    orderToken,
    orderId: orderIdFromMeta,
    patch: {
      payment_provider: "stripe",
      stripe_event_id_last: event.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: customerId,
      payment_method_type: paymentMethodType,
      status: isPaid ? "paid" : "payment_pending",
      payment_status: isPaid ? "paid" : "pending",
      paid_at: isPaid ? nowIso() : null,
      failure_reason: null,
    },
  });

  // 2) issue tickets only when truly paid
  if (isPaid) {
    const attendeeName =
      updated.customer_full_name ?? updated.billing_name ?? null;
    await issueTicketsIfMissing({
      orderId: updated.id,
      orderToken: updated.public_token,
      attendeeName,
    });
  }

  console.log("[stripe webhook] order processed", {
    eventId: event.id,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    orderToken,
    orderIdFromMeta,
    updated,
  });
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  await handlePaidOrder({ event, session });
}

async function handleAsyncPaymentSucceeded(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // async succeeded => treat as paid
  (session as any).payment_status = "paid";
  await handlePaidOrder({ event, session });
}

async function handleAsyncPaymentFailed(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const orderToken = getOrderTokenFromSession(session);
  const orderId = getOrderIdFromSession(session);
  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);

  const updated = await updateOrderByTokenOrId({
    orderToken,
    orderId,
    patch: {
      payment_provider: "stripe",
      stripe_event_id_last: event.id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: customerId,
      status: "payment_failed",
      payment_status: "failed",
      payment_failed_at: nowIso(),
      failure_reason: "async_payment_failed",
    },
  });

  console.log("[stripe webhook] async_payment_failed -> order updated", {
    eventId: event.id,
    sessionId: session.id,
    updated,
  });
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent;

  const orderToken =
    asString(pi.metadata?.orderToken) ||
    asString(pi.metadata?.order_token) ||
    asString(pi.metadata?.token) ||
    asString(pi.metadata?.publicToken) ||
    asString(pi.metadata?.public_order_token) ||
    null;

  const orderId =
    asString(pi.metadata?.orderId) || asString(pi.metadata?.order_id) || null;

  if (!orderToken && !orderId) {
    console.log(
      "[stripe webhook] payment_intent.succeeded without order metadata (ignored)",
      {
        eventId: event.id,
        paymentIntentId: pi.id,
      },
    );
    return;
  }

  const updated = await updateOrderByTokenOrId({
    orderToken,
    orderId,
    patch: {
      payment_provider: "stripe",
      stripe_event_id_last: event.id,
      stripe_payment_intent_id: pi.id,
      stripe_customer_id:
        typeof pi.customer === "string"
          ? pi.customer
          : (pi.customer?.id ?? null),
      status: "paid",
      payment_status: "paid",
      paid_at: nowIso(),
      failure_reason: null,
    },
  });

  await issueTicketsIfMissing({
    orderId: updated.id,
    orderToken: updated.public_token,
    attendeeName: updated.customer_full_name ?? updated.billing_name ?? null,
  });

  console.log(
    "[stripe webhook] payment_intent.succeeded -> order updated + tickets issued",
    {
      eventId: event.id,
      paymentIntentId: pi.id,
      updated,
    },
  );
}

async function dispatchStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      return;
    case "checkout.session.async_payment_succeeded":
      await handleAsyncPaymentSucceeded(event);
      return;
    case "checkout.session.async_payment_failed":
      await handleAsyncPaymentFailed(event);
      return;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event);
      return;
    default:
      console.log("[stripe webhook] unhandled event type:", event.type);
      return;
  }
}

export async function POST(req: Request) {
  try {
    const hdrs = await headers();
    const signature = hdrs.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    const rawBody = await req.text();

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );

    await dispatchStripeEvent(event);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[stripe webhook] error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" });
}
