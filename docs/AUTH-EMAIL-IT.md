# Template email Auth (italiano)

Incolla questi testi in **Supabase → Authentication → Emails → Templates**.  
Il mittente è già `Associazione Zoe <info@associazionezoe.org>`.

Usa **Body** in HTML. Non modificare `{{ .ConfirmationURL }}`.

---

## Confirm signup (Conferma registrazione)

**Subject:** Conferma la tua email · Associazione Zoe

```html
<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#fff6ea;font-family:Nunito,Arial,Helvetica,sans-serif;color:#14285c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:3px solid #1b45d6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="height:10px;background:#ffd000;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;text-align:center;">
                <img src="https://app-zoe.vercel.app/brand/zoe-logo.png" alt="Zoe" width="120" style="display:inline-block;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#e30613;">Iscrizione soci</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#1b45d6;">Conferma la tua email</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#14285c;">Ciao,</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#14285c;">grazie per la richiesta di iscrizione ad Associazione Zoe. Per continuare, conferma questo indirizzo email.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e30613;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;">Conferma l’email</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#14285c;">Dopo la conferma, Team Zoe valuta la richiesta. Quando sei approvata/o, l’area soci si apre. Il numero tessera viene assegnato in un secondo momento, in associazione.</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#142c86;">Se non hai richiesto tu la registrazione, ignora questa email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid rgba(20,40,92,0.12);text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#1b45d6;">Associazione Zoe</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#14285c;">Via Li Punti 12, Sassari<br />info@associazionezoe.org</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Reset password

**Subject:** Reimposta la password · Associazione Zoe

```html
<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#fff6ea;font-family:Nunito,Arial,Helvetica,sans-serif;color:#14285c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:3px solid #1b45d6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="height:10px;background:#ffd000;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#e30613;">Area soci</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#1b45d6;">Reimposta la password</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#14285c;">Abbiamo ricevuto una richiesta per il tuo account Zoe. Scegli una nuova password con il pulsante qui sotto.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1b45d6;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;">Scegli la password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#142c86;">Se non hai richiesto tu il reset, ignora questa email: la password resta invariata.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid rgba(20,40,92,0.12);text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#1b45d6;">Associazione Zoe</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#14285c;">Via Li Punti 12, Sassari<br />info@associazionezoe.org</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Magic Link

**Subject:** Accedi ad Associazione Zoe

```html
<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#fff6ea;font-family:Nunito,Arial,Helvetica,sans-serif;color:#14285c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:3px solid #1b45d6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="height:10px;background:#ffd000;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;text-align:center;">
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#1b45d6;">Accedi a Zoe</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#14285c;">Usa questo pulsante per entrare nel tuo account. Il link scade a breve.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e30613;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;">Accedi</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#142c86;">Se non hai richiesto tu l’accesso, ignora questa email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid rgba(20,40,92,0.12);text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#1b45d6;">Associazione Zoe</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#14285c;">Via Li Punti 12, Sassari<br />info@associazionezoe.org</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Invite user (Team Zoe)

**Subject:** Invito Team Zoe · Associazione Zoe

```html
<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#fff6ea;font-family:Nunito,Arial,Helvetica,sans-serif;color:#14285c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:3px solid #1b45d6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="height:10px;background:#ffd000;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#e30613;">Team Zoe</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#1b45d6;">Sei invitata/o in amministrazione</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#14285c;">Imposta la password e accedi all’area Team Zoe.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e30613;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;">Imposta la password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid rgba(20,40,92,0.12);text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#1b45d6;">Associazione Zoe</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#14285c;">Via Li Punti 12, Sassari<br />info@associazionezoe.org</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Change email address

**Subject:** Conferma il nuovo indirizzo email · Associazione Zoe

```html
<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#fff6ea;font-family:Nunito,Arial,Helvetica,sans-serif;color:#14285c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff6ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:3px solid #1b45d6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="height:10px;background:#ffd000;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;text-align:center;">
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#1b45d6;">Conferma il nuovo indirizzo</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#14285c;">Per aggiornare l’email del tuo account Zoe, conferma questo indirizzo.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 24px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1b45d6;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:12px;">Conferma l’email</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#142c86;">Se non hai richiesto tu il cambio, ignora questa email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;border-top:1px solid rgba(20,40,92,0.12);text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#1b45d6;">Associazione Zoe</p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#14285c;">Via Li Punti 12, Sassari<br />info@associazionezoe.org</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```
