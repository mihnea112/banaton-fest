import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateDraftBody = {
  source?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateDraftBody;

    console.log("[order-draft] create start", { body });

    const publicToken = randomUUID();

    // IMPORTANT:
    // dacă tabela ta are alte coloane obligatorii, adaugă-le aici
    const insertPayload: Record<string, unknown> = {
      public_token: publicToken,
      status: "draft",
      // source: body.source ?? "web", // de-comentează DOAR dacă ai coloana source în orders
    };

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert(insertPayload)
      .select("id, public_token, status")
      .single();

    if (error) {
      console.error("[order-draft] insert error", error);
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Nu s-a putut crea comanda draft.",
            details: error.message,
            code: error.code,
          },
        },
        { status: 500 },
      );
    }

    console.log("[order-draft] create success", {
      id: data?.id,
      publicToken: data?.public_token,
      status: data?.status,
    });

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: data?.id,
          publicToken: data?.public_token,
          status: data?.status,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[order-draft] unexpected error", err);

    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "Eroare internă la crearea comenzii draft.",
        },
      },
      { status: 500 },
    );
  }
}
