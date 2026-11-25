import { corsHeaders } from "../_shared/cors.ts";
import { getAnonClient, getServiceClient } from "../_shared/supabase.ts";

type PriceOption = "pack5" | "pack10" | "monthly" | "course" | "workshop" | "online";

const PRICE_FIELDS: Record<PriceOption, string> = {
  pack5: "price_pack5",
  pack10: "price_pack10",
  monthly: "price_monthly",
  course: "price_course",
  workshop: "price_course",
  online: "price_course",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const userClient = getAnonClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "unauthorized" }, 401);
    }

    const body = await req.json();
    const productId = String(body.productId ?? "");
    const productSlug = String(body.productSlug ?? "");
    const priceOption = String(body.priceOption ?? "") as PriceOption;
    const participantRaw = String(body.participantId ?? "").trim();
    const participantId = participantRaw || null;
    if ((!productId && !productSlug) || !(priceOption in PRICE_FIELDS)) {
      return json({ error: "invalid_payload" }, 400);
    }

    if (!user.email_confirmed_at) {
      return json({ error: "email_not_verified" }, 403);
    }

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id, role, member_status")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "member" || profile.member_status !== "approved") {
      return json({ error: "member_not_approved" }, 403);
    }

    let productQuery = service.from("products").select("*").eq("published", true);
    productQuery = productId
      ? productQuery.eq("id", productId)
      : productQuery.eq("slug", productSlug);
    const { data: product, error: productError } = await productQuery.maybeSingle();

    if (productError || !product) {
      return json({ error: "product_not_found" }, 404);
    }

    const priceField = PRICE_FIELDS[priceOption];
    const unitEuro = Number(product[priceField]);
    if (!Number.isFinite(unitEuro) || unitEuro <= 0) {
      return json({ error: "price_unavailable" }, 400);
    }

    const unitCents = Math.round(unitEuro * 100);
    const isPack = priceOption === "pack5" || priceOption === "pack10";
    let orderParticipantId: string | null = null;
    if (isPack) {
      const { data: children } = await service
        .from("participants")
        .select("id")
        .eq("guardian_user_id", user.id);
      const childIds = (children ?? []).map((row) => row.id as string);
      if (childIds.length > 0) {
        if (!participantId || !childIds.includes(participantId)) {
          return json({ error: "participant_required" }, 400);
        }
        orderParticipantId = participantId;
      }
    }

    const { data: order, error: orderError } = await service
      .from("orders")
      .insert({
        buyer_user_id: user.id,
        beneficiary_user_id: user.id,
        status: "pending",
        currency: "eur",
        total_cents: unitCents,
      })
      .select("*")
      .single();

    if (orderError || !order) {
      return json({ error: "order_create_failed", detail: orderError?.message }, 500);
    }

    const { error: itemError } = await service.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      price_option: priceOption,
      unit_price_cents: unitCents,
      quantity: 1,
      product_title_snapshot: product.title,
      product_kind_snapshot: product.kind,
      participant_id: orderParticipantId,
    });

    if (itemError) {
      await service.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      return json({ error: "order_item_failed", detail: itemError.message }, 500);
    }

    await service.from("payments").insert({
      order_id: order.id,
      provider: "mock",
      status: "pending",
      amount_cents: unitCents,
      currency: "eur",
    });

    return json({
      orderId: order.id,
      totalCents: unitCents,
      currency: "eur",
      status: order.status,
    });
  } catch (error) {
    return json(
      { error: "unexpected", detail: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
