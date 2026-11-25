import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const FROM_EMAIL =
  Deno.env.get("SMTP_FROM_EMAIL")?.trim() ||
  Deno.env.get("MAILERSEND_FROM_EMAIL")?.trim() ||
  "info@associazionezoe.org";
const FROM_NAME =
  Deno.env.get("SMTP_FROM_NAME")?.trim() ||
  Deno.env.get("MAILERSEND_FROM_NAME")?.trim() ||
  "Associazione Zoe";

type MailInput = {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
};

function smtpReady() {
  return Boolean(Deno.env.get("SMTP_USER")?.trim() && Deno.env.get("SMTP_PASS")?.trim());
}

export function isMailReady() {
  return smtpReady() || Boolean(Deno.env.get("MAILERSEND_API_TOKEN")?.trim());
}

async function sendSmtpEmail(input: MailInput) {
  const hostname = Deno.env.get("SMTP_HOST")?.trim() || "smtps.aruba.it";
  const port = Number(Deno.env.get("SMTP_PORT")?.trim() || "465");
  const username = Deno.env.get("SMTP_USER")!.trim();
  const password = Deno.env.get("SMTP_PASS")!.trim();
  const client = new SMTPClient({
    connection: {
      hostname,
      port,
      tls: port === 465,
      auth: { username, password },
    },
  });
  try {
    await client.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: input.toName ? `${input.toName} <${input.toEmail}>` : input.toEmail,
      subject: input.subject,
      content: input.text,
      html: input.html,
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "smtp_failed" };
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

export async function sendMailerSendEmail(input: MailInput) {
  const token = Deno.env.get("MAILERSEND_API_TOKEN")?.trim();
  if (!token) return { ok: false as const, error: "mailersend_not_configured" };

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: input.toEmail, name: input.toName || input.toEmail }],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false as const, error: `mailersend_${res.status}`, detail };
  }
  return { ok: true as const };
}

export async function sendZoeEmail(input: MailInput) {
  if (smtpReady()) return sendSmtpEmail(input);
  return sendMailerSendEmail(input);
}

export function siteUrl() {
  return (Deno.env.get("SITE_URL") || "https://app-zoe.vercel.app").replace(/\/$/, "");
}

export function zoeBrandedEmailHtml(input: {
  eyebrow: string;
  title: string;
  greeting: string;
  body: string;
  extraHtml?: string;
  buttonUrl: string;
  buttonLabel: string;
  footnote: string;
}) {
  const logo = `${siteUrl()}/brand/zoe-logo.png`;
  return `<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#fff6ea;font-family:Nunito,Arial,Helvetica,sans-serif;color:#14285c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:16px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:3px solid #1b45d6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="height:8px;background:#ffd000;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:20px 28px 4px;text-align:center;">
                <img src="${logo}" alt="Zoe" width="108" style="display:inline-block;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 4px;text-align:center;">
                <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#e30613;">${input.eyebrow}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;text-align:center;">
                <p style="margin:0;font-size:24px;line-height:1.25;font-weight:800;color:#1b45d6;">${input.title}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 0;text-align:${input.extraHtml ? "left" : "center"};">
                <p style="margin:0 0 8px;font-size:16px;line-height:1.45;color:#14285c;text-align:${input.extraHtml ? "left" : "center"};">${input.greeting}</p>
                <p style="margin:0;font-size:16px;line-height:1.45;color:#14285c;">${input.body}</p>
                ${input.extraHtml ?? ""}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 28px 12px;">
                <a href="${input.buttonUrl}" style="display:inline-block;background:#e30613;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:12px 24px;border-radius:12px;">${input.buttonLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;text-align:center;">
                <p style="margin:0;font-size:13px;line-height:1.45;color:#142c86;">${input.footnote}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 18px;border-top:1px solid rgba(20,40,92,0.12);text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#1b45d6;">Associazione Zoe</p>
                <p style="margin:0;font-size:13px;line-height:1.45;color:#14285c;">Via Li Punti 12, Sassari<br />info@associazionezoe.org</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
