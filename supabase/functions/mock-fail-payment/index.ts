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
    if (order.status === "paid") {
      return json({ error: "order_already_paid" }, 409);
    }

    const eventId = `mock_fail_${order.id}_${Date.now()}`;
    await service.from("payment_events").insert({
      provider: "mock",
      event_id: eventId,
      event_type: "mock.payment.failed",
      order_id: order.id,
      payload: { orderId: order.id, userId: user.id },
    });

    await service
      .from("payments")
      .update({ status: "failed", raw: { simulated: true, failed: true } })
      .eq("order_id", order.id)
      .eq("provider", "mock");

    await service
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("buyer_user_id", user.id);

    return json({ orderId: order.id, status: "failed" });
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
