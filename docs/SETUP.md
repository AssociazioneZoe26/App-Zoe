# Setup App Zoe

Guida breve per sviluppo e deploy. Progetto: Vite + React + Supabase + Vercel.

## 1. Ambiente locale

```bash
cp env.example .env.local
# Compila VITE_SUPABASE_ANON_KEY dal dashboard Supabase → Project Settings → API
npm install
npm run dev
```

Variabili browser (solo queste in Vite):

| Variabile | Dove |
|-----------|------|
| `VITE_SUPABASE_URL` | Dashboard Supabase → API |
| `VITE_SUPABASE_ANON_KEY` | Dashboard Supabase → API (anon / publishable) |

Non mettere mai la `service_role` in `.env.local` o su Vercel frontend.

## 2. Supabase

- Progetto APP ZOE: `eyyprcnbyhkygxiggais`
- Migration in `supabase/migrations/` — applicarle sul progetto remoto
- Edge Functions: `create-order`, `mock-confirm-payment`, `mock-fail-payment`, `set-member-status`
- Secrets funzioni (CLI): `APP_ENV`, `ALLOW_MOCK_PAYMENTS` (solo development), eventuali chiavi Stripe

Auth Site URL e Redirect URLs devono includere:

- `https://app-zoe.vercel.app`
- `http://localhost:5173` (o la porta Vite in uso)
- eventuale dominio custom futuro

## 3. Catalogo Academy

- Sorgente primaria: tabella `products` su Supabase
- Admin → Catalogo: all’apertura sincronizza locale → cloud, poi rilegge dal cloud
- **Elimina**: cancella anche su Supabase; se ci sono iscrizioni/ordini, propone **Bozza**
- **Bozza**: `published = false` (sparisce dal catalogo pubblico)

## 4. Deploy Vercel

Team `zoe-app`, progetto `app-zoe`.

```bash
npx vercel deploy --prod -y --scope zoe-app
```

Su Vercel (Production/Preview) impostare le stesse `VITE_SUPABASE_*`, poi rebuild.

## 5. Email Auth (Supabase)

Dashboard → Authentication → Email Templates. Testi IT di riferimento: `docs/AUTH-EMAIL-IT.md`.

Per produzione: SMTP custom (Resend/Brevo) con mittente Zoe.

## 6. Account ruoli

| Ruolo | Dove |
|-------|------|
| Socio | `profiles.role = member` + `member_status` |
| Team Zoe | `profiles.role = team_zoe` |

Accesso: `/accedi` (associati) e `/admin/login` (Team Zoe).
