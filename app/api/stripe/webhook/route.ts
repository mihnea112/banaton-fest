// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET_ENV = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
if (!STRIPE_WEBHOOK_SECRET_ENV)
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");

const STRIPE_WEBHOOK_SECRET: string = STRIPE_WEBHOOK_SECRET_ENV;

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

// ✅ allowlist cu coloanele PE CARE LE AI (din outputul tău)
const ORDER_UPDATE_ALLOWLIST = new Set([
  "status",
  "payment_status",
  "payment_provider",
  "payment_provider_intent_id",
  "payment_reference",
  "currency",
  "subtotal_ron",
  "total_ron",
  "notes",
  "customer_first_name",
  "customer_last_name",
  "customer_full_name",
  "customer_email",
  "customer_phone",
  "billing_city",
  "billing_county",
  "billing_address",
  "billing_name",
  "billing_country",
  "expires_at",
  "failure_reason",
  "updated_at",
]);

type OrderRow = {
  id: string;
  public_token: string;
  status: string | null;
  payment_status: string | null;

  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_full_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;

  billing_city?: string | null;
  billing_county?: string | null;
  billing_address?: string | null;
  billing_name?: string | null;
  billing_country?: string | null;

  currency?: string | null;
  subtotal_ron?: number | null;
  discount_ron?: number | null;
  fees_ron?: number | null;
  total_ron?: number | null;

  payment_provider?: string | null;
  payment_provider_intent_id?: string | null;
  payment_reference?: string | null;

  failure_reason?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function centsToRon(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / 100) * 100) / 100;
}

function upperCurrency(v: unknown): string | null {
  const s = asString(v);
  return s ? s.toUpperCase() : null;
}

function splitName(full: string | null): {
  first: string | null;
  last: string | null;
} {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: full.trim(), last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function sanitizePatch(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(patch)) {
    // hard-block legacy/non-existent columns (defensive)
    if (
      k === "paid_at" ||
      k === "payment_failed_at" ||
      k === "stripe_checkout_session_id" ||
      k === "stripe_payment_intent_id" ||
      k === "stripe_customer_id" ||
      k === "stripe_event_id_last" ||
      k === "failure_message"
    ) {
      continue;
    }

    if (!ORDER_UPDATE_ALLOWLIST.has(k)) continue;
    out[k] = v;
  }

  // always touch updated_at
  out.updated_at = nowIso();
  return out;
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
    asString((md as any).orderToken) ||
    asString((md as any).order_token) ||
    asString((md as any).token) ||
    asString((md as any).publicToken) ||
    asString((md as any).public_order_token) ||
    null
  );
}

function getOrderIdFromSession(
  session: Stripe.Checkout.Session,
): string | null {
  const md = session.metadata || {};
  return (
    asString((md as any).orderId) || asString((md as any).order_id) || null
  );
}

async function loadOrderByTokenOrId(params: {
  orderToken?: string | null;
  orderId?: string | null;
}) {
  const { orderToken, orderId } = params;

  let q = supabase
    .from("orders")
    .select(
      `
      id,
      public_token,
      status,
      payment_status,
      customer_first_name,
      customer_last_name,
      customer_full_name,
      customer_email,
      customer_phone,
      billing_city,
      billing_county,
      billing_address,
      billing_name,
      billing_country,
      currency,
      subtotal_ron,
      discount_ron,
      fees_ron,
      total_ron,
      payment_provider,
      payment_provider_intent_id,
      payment_reference,
      failure_reason
    `,
    )
    .limit(1);

  if (orderId) q = q.eq("id", orderId);
  else if (orderToken) q = q.eq("public_token", orderToken);
  else throw new Error("No order identifier found (orderId/orderToken)");

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      `Order not found for ${orderId ? `id=${orderId}` : `public_token=${orderToken}`}`,
    );
  }

  return data as OrderRow;
}

async function updateOrderByTokenOrId(params: {
  orderToken?: string | null;
  orderId?: string | null;
  patch: Record<string, unknown>;
}) {
  const { orderToken, orderId, patch } = params;

  let q = supabase.from("orders").update(sanitizePatch(patch));

  if (orderId) q = q.eq("id", orderId);
  else if (orderToken) q = q.eq("public_token", orderToken);
  else throw new Error("No order identifier found (orderId/orderToken)");

  const { data, error } = await q
    .select("id, public_token, status, payment_status")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Order update returned no row");
  return data as Pick<
    OrderRow,
    "id" | "public_token" | "status" | "payment_status"
  >;
}

function buildEnrichmentPatchFromSession(params: {
  existing: OrderRow;
  session: Stripe.Checkout.Session;
}) {
  const { existing, session } = params;

  // ✅ Source of truth = your checkout form -> Stripe metadata
  // We will NEVER persist Stripe-collected email/name/phone.
  const md = (session.metadata || {}) as Record<string, unknown>;

  const firstFromForm =
    asString(md.customer_first_name) || asString(md.customerFirstName) || null;

  const lastFromForm =
    asString(md.customer_last_name) || asString(md.customerLastName) || null;

  const fullFromForm =
    asString(md.customer_full_name) ||
    asString(md.customerFullName) ||
    (firstFromForm || lastFromForm
      ? [firstFromForm, lastFromForm].filter(Boolean).join(" ")
      : null);

  // STRICT: email is ONLY taken from your form metadata
  const emailFromForm =
    asString(md.customer_email) || asString(md.customerEmail) || null;

  // STRICT: phone is ONLY taken from your form metadata
  const phoneFromForm =
    asString(md.customer_phone) || asString(md.customerPhone) || null;

  // Billing fields – prefer metadata from your form; only fall back to Stripe customer_details.address
  const billingNameFromForm =
    asString(md.billing_name) || asString(md.billingName) || fullFromForm;

  const billingCountryFromForm =
    asString(md.billing_country) || asString(md.billingCountry) || null;

  const billingAddressFromForm =
    asString(md.billing_address) || asString(md.billingAddress) || null;

  // City/County can come as a single field "City, County" from your form
  const cityCountyFromForm =
    asString(md.billing_city_county) ||
    asString(md.billingCityCounty) ||
    asString(md.cityCounty) ||
    null;

  const billingCityFromForm =
    asString(md.billing_city) || asString(md.billingCity) || null;

  const billingCountyFromForm =
    asString(md.billing_county) || asString(md.billingCounty) || null;

  let cityFromForm = billingCityFromForm;
  let countyFromForm = billingCountyFromForm;

  if ((!cityFromForm || !countyFromForm) && cityCountyFromForm) {
    const parts = cityCountyFromForm.split(",").map((p) => p.trim()).filter(Boolean);
    if (!cityFromForm && parts[0]) cityFromForm = parts[0];
    if (!countyFromForm && parts[1]) countyFromForm = parts[1];
  }

  const details = session.customer_details ?? null;
  const addr = details?.address ?? null;

  const cityFromStripe = asString(addr?.city) ?? null;
  const stateFromStripe = asString((addr as any)?.state) ?? null; // RO: județ poate veni aici uneori
  const countryFromStripe = asString(addr?.country) ?? null;
  const line1 = asString(addr?.line1) ?? null;
  const line2 = asString(addr?.line2) ?? null;
  const billingAddressFromStripe = [line1, line2].filter(Boolean).join(", ") || null;

  // amounts in cents -> RON
  const subtotalRon = centsToRon((session as any).amount_subtotal);
  const totalRon = centsToRon((session as any).amount_total);

  // NOTE: your current orders table does not include discount_ron / fees_ron
  // Keep only subtotal_ron and total_ron.

  const currency = upperCurrency((session as any).currency) ?? "RON";

  // ✅ Customer identity fields: ALWAYS prefer form values.
  // Email must ALWAYS be the form email when present (even if DB already has a different one).
  const patch: Record<string, unknown> = {};

  // Names
  if (fullFromForm && existing.customer_full_name !== fullFromForm) {
    patch.customer_full_name = fullFromForm;
  }
  if (firstFromForm && existing.customer_first_name !== firstFromForm) {
    patch.customer_first_name = firstFromForm;
  } else if (!existing.customer_first_name && splitName(fullFromForm).first) {
    // fallback only if form full name exists but first/last not explicitly provided
    patch.customer_first_name = splitName(fullFromForm).first;
  }

  if (lastFromForm && existing.customer_last_name !== lastFromForm) {
    patch.customer_last_name = lastFromForm;
  } else if (!existing.customer_last_name && splitName(fullFromForm).last) {
    patch.customer_last_name = splitName(fullFromForm).last;
  }

  // Email (strict)
  if (emailFromForm && existing.customer_email !== emailFromForm) {
    patch.customer_email = emailFromForm;
  }

  // Phone (prefer form; do not use Stripe collected phone)
  if (phoneFromForm && existing.customer_phone !== phoneFromForm) {
    patch.customer_phone = phoneFromForm;
  }

  // Billing: ALWAYS prefer values coming from your form metadata.
  // Fall back to Stripe address ONLY if form metadata is missing.

  if (!existing.billing_name && billingNameFromForm) {
    patch.billing_name = billingNameFromForm;
  }

  const effectiveCountry = billingCountryFromForm || countryFromStripe;
  if (!existing.billing_country && effectiveCountry) {
    patch.billing_country = effectiveCountry;
  }

  const effectiveCity = cityFromForm || cityFromStripe;
  if (!existing.billing_city && effectiveCity) {
    patch.billing_city = effectiveCity;
  }

  const effectiveCounty = countyFromForm || stateFromStripe;
  if (!existing.billing_county && effectiveCounty) {
    patch.billing_county = effectiveCounty;
  }

  const effectiveBillingAddress = billingAddressFromForm || billingAddressFromStripe;
  if (!existing.billing_address && effectiveBillingAddress) {
    patch.billing_address = effectiveBillingAddress;
  }

  if (!existing.currency && currency) patch.currency = currency;

  if (!existing.subtotal_ron && subtotalRon > 0)
    patch.subtotal_ron = subtotalRon;
  if (!existing.total_ron && totalRon > 0) patch.total_ron = totalRon;

  return patch;
}

async function handlePaidOrder(params: {
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
}) {
  const { event, session } = params;

  const orderToken = getOrderTokenFromSession(session);
  const orderIdFromMeta = getOrderIdFromSession(session);

  const paymentIntentId = getPaymentIntentId(session.payment_intent);
  const checkoutSessionId = session.id;

  const isPaid = session.payment_status === "paid";

  // 1) load existing row (ca să completăm doar dacă e gol)
  const existing = await loadOrderByTokenOrId({
    orderToken,
    orderId: orderIdFromMeta,
  });

  console.log("[stripe webhook] metadata debug", {
    eventId: event.id,
    sessionId: session.id,
    orderToken,
    orderIdFromMeta,
    hasCustomerEmailInMetadata: !!(session.metadata && ((session.metadata as any).customer_email || (session.metadata as any).customerEmail)),
  });

  // 2) base payment patch (coloane existente la tine)
  const basePatch: Record<string, unknown> = {
    payment_provider: "stripe",
    payment_provider_intent_id: paymentIntentId,
    payment_reference: checkoutSessionId,
    status: isPaid ? "paid" : "payment_pending",
    payment_status: isPaid ? "paid" : "pending",
    failure_reason: null,
  };

  // 3) enrichment patch (customer + billing + amounts)
  const enrichPatch = buildEnrichmentPatchFromSession({ existing, session });

  const finalPatch = { ...basePatch, ...enrichPatch };
  console.log("[stripe webhook] orders.update keys", Object.keys(finalPatch));

  const updated = await updateOrderByTokenOrId({
    orderToken,
    orderId: orderIdFromMeta,
    patch: finalPatch,
  });

  console.log("[stripe webhook] order updated", {
    eventId: event.id,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    orderToken,
    orderIdFromMeta,
    updated,
    enrichPatchKeys: Object.keys(enrichPatch),
  });
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  await handlePaidOrder({ event, session });
}

async function handleAsyncPaymentSucceeded(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  (session as any).payment_status = "paid";
  await handlePaidOrder({ event, session });
}

async function handleAsyncPaymentFailed(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const orderToken = getOrderTokenFromSession(session);
  const orderId = getOrderIdFromSession(session);

  const paymentIntentId = getPaymentIntentId(session.payment_intent);

  await updateOrderByTokenOrId({
    orderToken,
    orderId,
    patch: {
      payment_provider: "stripe",
      payment_provider_intent_id: paymentIntentId,
      payment_reference: session.id,
      status: "payment_failed",
      payment_status: "failed",
      failure_reason: "async_payment_failed",
    },
  });

  console.log("[stripe webhook] async_payment_failed -> order updated", {
    eventId: event.id,
    sessionId: session.id,
    orderToken,
    orderId,
  });
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  // optional fallback; poți lăsa doar log
  const pi = event.data.object as Stripe.PaymentIntent;
  console.log("[stripe webhook] payment_intent.succeeded", {
    eventId: event.id,
    paymentIntentId: pi.id,
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
      await handlePaymentIntentSucceeded(event);
      return;
    default:
      console.log("[stripe webhook] unhandled event type:", event.type);
      return;
  }
}

function serializeUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
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
    const msg = serializeUnknownError(error);
    console.error("[stripe webhook] error:", error);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" });
}
