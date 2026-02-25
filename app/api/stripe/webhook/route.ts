// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe SDK init
 * Compatibil cu versiunea ta (API version "2026-01-28.clover")
 */
const _stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const _stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!_stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}
if (!_stripeWebhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

const STRIPE_SECRET_KEY: string = _stripeSecretKey;
const STRIPE_WEBHOOK_SECRET: string = _stripeWebhookSecret;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

/**
 * Supabase (service role) - necesar pentru update la comenzi din webhook
 */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL");
}
if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

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

function getOrderTokenFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  // Acceptă mai multe chei, ca să fie robust
  const md = session.metadata || {};
  return (
    asString(md.orderToken) ||
    asString(md.order_token) ||
    asString(md.token) ||
    asString(md.publicToken) ||
    null
  );
}

function getOrderIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  const md = session.metadata || {};
  return asString(md.orderId) || asString(md.order_id) || null;
}

function getPaymentIntentId(
  value: string | Stripe.PaymentIntent | null,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
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

  if (orderId) {
    query = query.eq("id", orderId);
  } else if (orderToken) {
    // adaptează aici dacă ai alt nume de coloană (ex: public_token)
    query = query.eq("public_token", orderToken);
  } else {
    throw new Error("No order identifier found (orderId/orderToken)");
  }

  const { data, error } = await query
    .select("id, public_token, status, payment_status")
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Order not found for ${orderId ? `id=${orderId}` : `public_token=${orderToken}`}`,
    );
  }

  return data[0];
}

/**
 * Opțional: log simplu în DB pentru debugging webhook (dacă ai tabel).
 * Dacă nu ai tabelul stripe_webhook_logs, prinde eroarea și continuă.
 */
async function tryInsertWebhookLog(
  event: Stripe.Event,
  status: "received" | "processed" | "error",
  message?: string,
) {
  try {
    await supabase.from("stripe_webhook_logs").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      status,
      message: message ?? null,
      created_at: nowIso(),
    });
  } catch {
    // ignorăm dacă tabelul nu există
  }
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const orderToken = getOrderTokenFromSession(session);
  const orderId = getOrderIdFromSession(session);

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

  // Pentru Stripe Checkout, "completed" nu garantează întotdeauna paid pentru metode async,
  // de aceea verificăm payment_status.
  const isPaid = session.payment_status === "paid";

  const patch: OrderStatusPatch = {
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
  };

  const updated = await updateOrderByTokenOrId({
    orderToken,
    orderId,
    patch,
  });

  console.log("[stripe webhook] checkout.session.completed -> order updated", {
    eventId: event.id,
    sessionId: session.id,
    orderToken,
    orderId,
    paymentStatus: session.payment_status,
    updated,
  });
}

async function handleAsyncPaymentSucceeded(event: Stripe.Event) {
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
      status: "paid",
      payment_status: "paid",
      paid_at: nowIso(),
      failure_reason: null,
    },
  });

  console.log(
    "[stripe webhook] checkout.session.async_payment_succeeded -> order updated",
    {
      eventId: event.id,
      sessionId: session.id,
      orderToken,
      orderId,
      updated,
    },
  );
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

  console.log(
    "[stripe webhook] checkout.session.async_payment_failed -> order updated",
    {
      eventId: event.id,
      sessionId: session.id,
      orderToken,
      orderId,
      updated,
    },
  );
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  // Opțional, util ca fallback/logging.
  // Dacă metadata cu orderToken este și pe PaymentIntent, poți actualiza și de aici.
  const pi = event.data.object as Stripe.PaymentIntent;
  const orderToken =
    asString(pi.metadata?.orderToken) ||
    asString(pi.metadata?.order_token) ||
    asString(pi.metadata?.token) ||
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

  console.log("[stripe webhook] payment_intent.succeeded -> order updated", {
    eventId: event.id,
    paymentIntentId: pi.id,
    orderToken,
    orderId,
    updated,
  });
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
      // fallback / extra siguranță
      await handlePaymentIntentSucceeded(event);
      return;

    // Poți adăuga și payment_intent.payment_failed dacă vrei
    default:
      console.log("[stripe webhook] unhandled event type:", event.type);
      return;
  }
}

export async function POST(req: Request) {
  let event: Stripe.Event | null = null;

  try {
    // IMPORTANT: în runtime-ul tău, headers() poate fi async -> folosim await
    const hdrs = await headers();
    const signature = hdrs.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    // Trebuie body RAW (text), nu req.json()
    const rawBody = await req.text();

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );

    await tryInsertWebhookLog(event, "received");

    await dispatchStripeEvent(event);

    await tryInsertWebhookLog(event, "processed");

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[stripe webhook] error:", error);

    if (event) {
      await tryInsertWebhookLog(
        event,
        "error",
        error instanceof Error ? error.message : "Unknown webhook error",
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 400 },
    );
  }
}

// Opțional (health check)
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/stripe/webhook",
    method: "POST",
  });
}
