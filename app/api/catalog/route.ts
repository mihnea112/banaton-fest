import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api";

export async function GET() {
  try {
    const [
      eventSettingsRes,
      daysRes,
      productsRes,
      pricesRes,
      zonesRes,
      tablesRes,
      vipAvailRes,
    ] = await Promise.all([
      supabaseAdmin.from("event_settings").select("*").limit(1).maybeSingle(),
      supabaseAdmin
        .from("event_days")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("ticket_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("ticket_product_prices")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("vip_table_zones")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("vip_tables")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("vip_table_day_availability")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

    const errors = [
      eventSettingsRes.error,
      daysRes.error,
      productsRes.error,
      pricesRes.error,
      zonesRes.error,
      tablesRes.error,
      vipAvailRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      return serverError("Eroare la încărcarea catalogului.", errors);
    }

    return ok({
      ok: true,
      event: eventSettingsRes.data,
      days: daysRes.data ?? [],
      products: productsRes.data ?? [],
      prices: pricesRes.data ?? [],
      vip: {
        zones: zonesRes.data ?? [],
        tables: tablesRes.data ?? [],
        availability: vipAvailRes.data ?? [],
      },
    });
  } catch (e) {
    return serverError("Eroare neașteptată la catalog.", String(e));
  }
}
