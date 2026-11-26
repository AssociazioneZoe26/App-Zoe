import { corsHeaders } from "../_shared/cors.ts";
import {
  isMailReady,
  sendZoeEmail,
  siteUrl,
  zoeBrandedEmailHtml,
} from "../_shared/mailersend.ts";
import { getAnonClient, getServiceClient } from "../_shared/supabase.ts";

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  age: string | null;
  schedule: string | null;
  time_label: string | null;
  place: string | null;
  preview_text: string | null;
  preview_image: string | null;
  published: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstNameOf(fullName?: string | null, firstName?: string | null) {
  const source = (firstName || fullName || "").trim();
  if (!source) return "";
  return source.split(/\s+/)[0];
}

function locandinaUrl(value: string | null | undefined, base: string) {
  const raw = (value || "").trim();
  if (!raw || raw.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/${raw}`;
}

function kindLabel(kind: string) {
  if (kind === "laboratorio") return "Laboratorio";
  if (kind === "workshop") return "Workshop";
  if (kind === "online") return "Online";
  return "Corso";
}

function periodWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 13);
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function buildDigest(
  products: ProductRow[],
  periodStart: string,
  periodEnd: string,
  opts?: { test?: boolean; greetingName?: string },
) {
  const base = siteUrl();
  const greetingName = (opts?.greetingName || "").trim();
  const greeting = greetingName ? `Ciao ${greetingName},` : "Ciao,";
  const lines = products.map((product) => {
    const when = [product.schedule, product.time_label].filter(Boolean).join(" · ");
    const meta = [kindLabel(product.kind), product.age, when, product.place]
      .filter(Boolean)
      .join(" · ");
    return {
      title: product.title,
      meta,
      url: `${base}/attivita/${product.slug}`,
      image: locandinaUrl(product.preview_image, base),
    };
  });

  const subject = `Zoe · corsi attivi ${periodStart} – ${periodEnd}`;
  const text = [
    greeting,
    "",
    "ecco i corsi e i laboratori attivi di Associazione Zoe per le prossime due settimane:",
    "",
    ...lines.flatMap((item) => [item.title, item.meta, item.url, ""]),
    "A presto,",
    "Team Zoe",
    "info@associazionezoe.org",
  ].join("\n");

  const extraHtml = lines
    .map((item) => {
      const poster = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:14px;margin:0 0 10px;" />`
        : "";
      return `<div style="margin:18px 0 0;">${poster}<p style="margin:0;font-size:16px;line-height:1.45;color:#14285c"><strong>${escapeHtml(item.title)}</strong><br/><span style="color:#142c86">${escapeHtml(item.meta)}</span><br/><a href="${item.url}" style="color:#e30613;font-weight:800">Scopri</a></p></div>`;
    })
    .join("");

  const html = zoeBrandedEmailHtml({
    eyebrow: "Newsletter",
    title: "Corsi attivi",
    greeting,
    body: "ecco i corsi e i laboratori attivi di Associazione Zoe per le prossime due settimane.",
    extraHtml,
    buttonUrl: `${base}/academy`,
    buttonLabel: "Vedi Academy",
    footnote: opts?.test
      ? "Questa è una prova: non è partita alla lista iscritti."
      : "Ricevi questa email perché sei iscritta/o alla newsletter Zoe.",
  });

  return { subject, text, html };
}

type SavedIssue = {
  id: string;
  subject: string;
  html: string;
  text_body: string;
  status: string;
};

function letterFromIssue(
  issue: SavedIssue,
  opts?: { test?: boolean; greetingName?: string },
) {
  const greetingName = (opts?.greetingName || "").trim();
  const greeting = greetingName ? `Ciao ${escapeHtml(greetingName)},` : "Ciao,";
  const base = siteUrl();
  const alreadyBranded = /<!doctype|<html/i.test(issue.html);
  const text = [
    ...(opts?.test ? ["TEST — questa email non è partita alla lista.", ""] : []),
    greetingName ? `Ciao ${greetingName},` : "Ciao,",
    "",
    issue.text_body,
  ].join("\n");
  const html = alreadyBranded
    ? issue.html
    : zoeBrandedEmailHtml({
        eyebrow: "Newsletter",
        title: escapeHtml(issue.subject),
        greeting,
        body: "",
        extraHtml: issue.html,
        buttonUrl: `${base}/academy`,
        buttonLabel: "Vedi Academy",
        footnote: opts?.test
          ? "Questa è una prova: non è partita alla lista iscritti."
          : "Ricevi questa email perché sei iscritta/o alla newsletter Zoe.",
      });
  return {
    subject: opts?.test ? `[Test] ${issue.subject}` : issue.subject,
    text,
    html,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing_auth" }, 401);
    const userClient = getAnonClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "team_zoe") return json({ error: "forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      send?: boolean;
      toEmail?: string;
      issueId?: string;
    };
    const action =
      body.action === "save_draft"
        ? "save_draft"
        : body.action === "send_test"
          ? "send_test"
          : body.action === "send_issue_test"
            ? "send_issue_test"
            : body.action === "send_issue"
              ? "send_issue"
              : "preview";

    if (action === "send_issue_test" || action === "send_issue") {
      const issueId = String(body.issueId ?? "").trim();
      if (!issueId) return json({ error: "issue_required" }, 400);
      if (!isMailReady()) return json({ error: "mail_not_configured" }, 503);

      const { data: issue, error: issueError } = await service
        .from("newsletter_issues")
        .select("id, subject, html, text_body, status")
        .eq("id", issueId)
        .maybeSingle();
      if (issueError || !issue) return json({ error: "issue_not_found" }, 404);
      const saved = issue as SavedIssue;

      if (action === "send_issue_test") {
        const toEmail = String(body.toEmail ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
          return json({ error: "email_required" }, 400);
        }
        const [{ data: subscriber }, { data: memberProfile }] = await Promise.all([
          service.from("newsletter_subscribers").select("full_name").eq("email", toEmail).maybeSingle(),
          service.from("profiles").select("full_name, first_name").eq("email", toEmail).maybeSingle(),
        ]);
        const greetingName = firstNameOf(
          subscriber?.full_name || memberProfile?.full_name,
          memberProfile?.first_name,
        );
        const letter = letterFromIssue(saved, { test: true, greetingName });
        const sent = await sendZoeEmail({
          toEmail,
          toName: greetingName || toEmail,
          subject: letter.subject,
          text: letter.text,
          html: letter.html,
        });
        if (!sent.ok) {
          return json({ error: sent.error, detail: "detail" in sent ? sent.detail : undefined }, 503);
        }
        return json({ ok: true, action, toEmail, subject: saved.subject });
      }

      if (saved.status === "sent") return json({ error: "already_sent" }, 409);
      const { data: recipients, error: listError } = await service
        .from("newsletter_subscribers")
        .select("email, full_name")
        .not("confirmed_at", "is", null)
        .is("unsubscribed_at", null);
      if (listError) return json({ error: "list_failed" }, 500);
      const list = recipients ?? [];
      if (list.length === 0) return json({ error: "no_recipients" }, 400);

      let sentCount = 0;
      const failed: string[] = [];
      for (const row of list) {
        const letter = letterFromIssue(saved, { greetingName: firstNameOf(row.full_name) });
        const sent = await sendZoeEmail({
          toEmail: row.email,
          toName: row.full_name,
          subject: letter.subject,
          text: letter.text,
          html: letter.html,
        });
        if (sent.ok) sentCount += 1;
        else failed.push(row.email);
      }
      if (sentCount === 0) return json({ error: "send_failed", failed }, 503);

      await service
        .from("newsletter_issues")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          recipient_count: sentCount,
        })
        .eq("id", saved.id);

      return json({
        ok: true,
        action,
        subject: saved.subject,
        sentCount,
        failed,
      });
    }
    const { periodStart, periodEnd } = periodWindow();

    const { data: products } = await service
      .from("products")
      .select(
        "id, slug, title, kind, age, schedule, time_label, place, preview_text, preview_image, published",
      )
      .eq("published", true)
      .order("title");

    const published = ((products as ProductRow[]) ?? []).filter((row) => row.published);

    const { count } = await service
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .not("confirmed_at", "is", null)
      .is("unsubscribed_at", null);

    const recipientCount = count ?? 0;
    const mailReady = isMailReady();
    const sendRequested = body.send === true;

    if (action === "send_test") {
      const toEmail = String(body.toEmail ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        return json({ error: "email_required" }, 400);
      }
      if (!mailReady) return json({ error: "mail_not_configured" }, 503);
      const [{ data: subscriber }, { data: memberProfile }] = await Promise.all([
        service
          .from("newsletter_subscribers")
          .select("full_name")
          .eq("email", toEmail)
          .maybeSingle(),
        service
          .from("profiles")
          .select("full_name, first_name")
          .eq("email", toEmail)
          .maybeSingle(),
      ]);
      const greetingName = firstNameOf(
        subscriber?.full_name || memberProfile?.full_name,
        memberProfile?.first_name,
      );
      const digest = buildDigest(published, periodStart, periodEnd, {
        test: true,
        greetingName,
      });
      const sent = await sendZoeEmail({
        toEmail,
        toName: greetingName || toEmail,
        subject: `[Test] ${digest.subject}`,
        text: `TEST — questa email non è partita alla lista.\n\n${digest.text}`,
        html: digest.html,
      });
      if (!sent.ok) {
        return json({ error: sent.error, detail: "detail" in sent ? sent.detail : undefined }, 503);
      }
      return json({
        ok: true,
        action,
        toEmail,
        periodStart,
        periodEnd,
        recipientCount,
        mailReady,
        courses: published.map((row) => ({
          id: row.id,
          title: row.title,
          kind: row.kind,
          slug: row.slug,
        })),
        subject: digest.subject,
      });
    }

    const digest = buildDigest(published, periodStart, periodEnd);

    let issueId: string | null = null;
    if (action === "save_draft" || sendRequested) {
      const status = sendRequested && mailReady ? "sent" : sendRequested ? "skipped" : "draft";
      const { data: issue, error } = await service
        .from("newsletter_issues")
        .insert({
          period_start: periodStart,
          period_end: periodEnd,
          subject: digest.subject,
          html: digest.html,
          text_body: digest.text,
          product_ids: published.map((row) => row.id),
          recipient_count: recipientCount,
          status,
          send_enabled: false,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (error) return json({ error: "save_failed", detail: error.message }, 500);
      issueId = issue?.id ?? null;

      if (status === "sent" && issueId) {
        const { data: recipients } = await service
          .from("newsletter_subscribers")
          .select("email, full_name")
          .not("confirmed_at", "is", null)
          .is("unsubscribed_at", null);
        for (const row of recipients ?? []) {
          const letter = buildDigest(published, periodStart, periodEnd, {
            greetingName: firstNameOf(row.full_name),
          });
          await sendZoeEmail({
            toEmail: row.email,
            toName: row.full_name,
            subject: letter.subject,
            text: letter.text,
            html: letter.html,
          });
        }
      }
    }

    return json({
      ok: true,
      action,
      periodStart,
      periodEnd,
      recipientCount,
      mailReady,
      sendEnabled: false,
      issueId,
      courses: published.map((row) => ({
        id: row.id,
        title: row.title,
        kind: row.kind,
        slug: row.slug,
      })),
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
      note: mailReady
        ? "Posta configurata, ma l’invio automatico resta spento finché non lo attivi."
        : "Bozza pronta. L’invio partirà quando colleghiamo la casella info@.",
    });
  } catch {
    return json({ error: "unexpected" }, 500);
  }
});
