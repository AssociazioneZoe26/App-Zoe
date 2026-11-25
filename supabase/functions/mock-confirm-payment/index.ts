import { corsHeaders } from "../_shared/cors.ts";
import {
  allowMockPayments,
  getAnonClient,
  getServiceClient,
} from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!allowMockPayments()) {
      return json({ error: "mock_disabled" }, 403);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const userClient = getAnonClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const allowlist = (Deno.env.get("MOCK_PAYMENT_ALLOWLIST") ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (
      allowlist.length > 0 &&
      !allowlist.includes((user.email ?? "").toLowerCase()) &&
      !allowlist.includes(user.id)
    ) {
      return json({ error: "mock_user_not_allowed" }, 403);
    }

    const { orderId } = await req.json();
    if (!orderId) return json({ error: "invalid_payload" }, 400);

    const service = getServiceClient();
    const { data: order } = await service
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("buyer_user_id", user.id)
      .maybeSingle();

    if (!order) return json({ error: "order_not_found" }, 404);
    if (order.status === "paid" && order.fulfilled_at) {
      return json({ orderId: order.id, status: "paid", alreadyFulfilled: true });
    }

    const eventId = `mock_success_${order.id}`;
    const { error: eventError } = await service.from("payment_events").insert({
      provider: "mock",
      event_id: eventId,
      event_type: "mock.payment.succeeded",
      order_id: order.id,
      payload: { orderId: order.id, userId: user.id },
    });
    if (eventError && eventError.code !== "23505") {
      return json({ error: "event_log_failed", detail: eventError.message }, 500);
    }

    await service
      .from("payments")
      .update({
        status: "succeeded",
        provider_payment_id: eventId,
        raw: { simulated: true },
      })
      .eq("order_id", order.id)
      .eq("provider", "mock");

    await service
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id)
      .eq("buyer_user_id", user.id);

    const { data: fulfilled, error: fulfillError } = await service.rpc(
      "fulfill_paid_order",
      { p_order_id: order.id },
    );
    if (fulfillError) {
      return json({ error: "fulfill_failed", detail: fulfillError.message }, 500);
    }

    return json({
      orderId: order.id,
      status: "paid",
      fulfilledAt: fulfilled?.fulfilled_at ?? null,
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
