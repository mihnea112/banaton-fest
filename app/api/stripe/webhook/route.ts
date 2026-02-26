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
  "discount_ron",
  "fees_ron",
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

function toInt(value: unknown, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
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
    if (!ORDER_UPDATE_ALLOWLIST.has(k)) continue;
    out[k] = v;
  }
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

/**
 * Determine next ticket_number (global increment) so inserts don't fail if ticket_number is NOT NULL.
 * NOTE: This is "good enough" for low concurrency. Best practice is GENERATED IDENTITY / SEQUENCE in DB.
 */
async function getNextTicketNumberStart(): Promise<number> {
  const { data, error } = await supabase
    .from("issued_tickets")
    .select("ticket_number")
    .order("ticket_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  const max = data && data[0] ? toInt((data[0] as any).ticket_number, 0) : 0;
  return max + 1;
}

/**
 * Issue tickets based on order_items.
 * Idempotent: if at least one ticket exists for the order_id, do nothing.
 */
async function issueTicketsIfMissing(params: {
  orderId: string;
  orderToken: string;
  attendeeName?: string | null;
}) {
  const { orderId, orderToken, attendeeName } = params;

  // 1) already issued?
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

  // 2) load order_items
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("id, qty, quantity, seats, tickets_count, name, label, product_name_snapshot")
    .eq("order_id", orderId);

  if (itemsErr) throw itemsErr;
  if (!items || items.length === 0) {
    console.warn("[tickets] no order_items found, cannot issue tickets", { orderId });
    return;
  }

  // 3) determine ticket number start
  let nextTicketNumber = await getNextTicketNumberStart();

  // 4) build tickets rows
  const rows: Array<{
    order_id: string;
    order_item_id: string;
    ticket_number: number;
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

    const displayName = it.name ?? it.label ?? it.product_name_snapshot ?? "Bilet";

    for (let i = 1; i <= qty; i++) {
      // QR text: unique + useful when scanning
      const qr = `banaton:${orderToken}:${it.id}:${i}`;

      rows.push({
        order_id: orderId,
        order_item_id: it.id,
        ticket_number: nextTicketNumber++,
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

  // 5) insert in batches
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error: insErr } = await supabase.from("issued_tickets").insert(slice);
    if (insErr) throw insErr;
  }

  console.log("[tickets] issued tickets inserted", { orderId, count: rows.length });
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

  // Stripe are și total_details cu discount/tax/shipping, dar tu ai discount_ron/fees_ron
  // Poți ajusta după cum calculezi tu; aici le pun safe 0 dacă nu există.
  const discountRon = centsToRon(
    (session as any).total_details?.amount_discount,
  );
  const feesRon = 0;

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
  if (!existing.discount_ron && discountRon > 0)
    patch.discount_ron = discountRon;
  if (!existing.fees_ron && feesRon > 0) patch.fees_ron = feesRon;
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

  const updated = await updateOrderByTokenOrId({
    orderToken,
    orderId: orderIdFromMeta,
    patch: { ...basePatch, ...enrichPatch },
  });

  if (isPaid) {
    // Prefer form name from metadata; do NOT use Stripe-collected email/name.
    const md = (session.metadata || {}) as Record<string, unknown>;
    const fullFromForm =
      asString(md.customer_full_name) ||
      asString(md.customerFullName) ||
      [
        asString(md.customer_first_name) || asString(md.customerFirstName),
        asString(md.customer_last_name) || asString(md.customerLastName),
      ]
        .filter(Boolean)
        .join(" ") ||
      null;

    const attendeeName = fullFromForm || null;

    await issueTicketsIfMissing({
      orderId: updated.id,
      orderToken: updated.public_token,
      attendeeName,
    });
  }

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
