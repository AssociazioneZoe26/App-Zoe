import { corsHeaders } from "../_shared/cors.ts";
import { getAnonClient, getServiceClient } from "../_shared/supabase.ts";

type Action = "approve" | "reject" | "suspend" | "reactivate";

const ACTION_TO_STATUS: Record<Action, "approved" | "rejected" | "suspended"> = {
  approve: "approved",
  reject: "rejected",
  suspend: "suspended",
  reactivate: "approved",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const userClient = getAnonClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const service = getServiceClient();
    const { data: adminProfile } = await service
      .from("profiles")
      .select("id, role, member_status")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminProfile || adminProfile.role !== "team_zoe") {
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json();
    const targetUserId = String(body.targetUserId ?? "");
    const action = String(body.action ?? "") as Action;
    const note = String(body.note ?? "").slice(0, 500);

    if (!targetUserId || !(action in ACTION_TO_STATUS)) {
      return json({ error: "invalid_payload" }, 400);
    }

    if (targetUserId === user.id) {
      return json({ error: "self_action_forbidden" }, 403);
    }

    const { data: target } = await service
      .from("profiles")
      .select("id, role, member_status, email, full_name, first_name, last_name")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!target) return json({ error: "target_not_found" }, 404);
    if (target.role === "team_zoe") {
      return json({ error: "cannot_change_team_zoe_via_this_endpoint" }, 403);
    }

    const toStatus = ACTION_TO_STATUS[action];
    const fromStatus = target.member_status;

    if (action === "approve" && fromStatus === "approved") {
      return json({ ok: true, unchanged: true, memberStatus: fromStatus });
    }
    if (action === "reject" && fromStatus !== "pending" && fromStatus !== "approved") {
      // allow reject from pending primarily; approved -> reject also ok if needed
    }

    const { error: updateError } = await service
      .from("profiles")
      .update({
        member_status: toStatus,
        status_changed_at: new Date().toISOString(),
        status_changed_by: user.id,
      })
      .eq("id", targetUserId)
      .eq("role", "member");

    if (updateError) {
      return json({ error: "update_failed", detail: updateError.message }, 500);
    }

    const { error: auditError } = await service.from("member_status_audit").insert({
      admin_user_id: user.id,
      target_user_id: targetUserId,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      note,
    });

    if (auditError) {
      return json({ error: "audit_failed", detail: auditError.message }, 500);
    }

    return json({
      ok: true,
      targetUserId,
      action,
      fromStatus,
      toStatus,
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
