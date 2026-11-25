# Resoconto Zoe Academy — aggiornato

**App Zoe web** · 9 novembre 2026 (aggiornamento pomeriggio)  
**Sito:** https://app-zoe.vercel.app  
**Priorità:** chiudere Academy sul web con i dati Zoe, poi App Store / Play Store

---

## Situazione attuale

La parte realizzabile **senza dati da Associazione Zoe** è sostanzialmente **conclusa**.  
I prossimi passi dipendono da risposte e contenuti di Zoe (pagamenti, email, testi, catalogo).

---

## Completato di recente (senza Zoe)

| Area | Cosa |
|------|------|
| Admin soci | Elenco soci approvati da Supabase (niente più socio di test) |
| Numero associato | Campo gestito da Team Zoe in Registrazioni (non visibile agli associati) |
| Rinnovi | Richiesta strutturata da area socio → database → Admin Attivazioni |
| Privacy / Termini | Pagine `/privacy` e `/termini` (bozza) + link in form e footer |
| Catalogo | Sorgente primaria Supabase; elimina sul cloud; bottone Bozza se bloccato |
| Account test | Rimosse password in chiaro dal codice |
| Newsletter | Banner home + Academy; iscritti in `newsletter_subscribers` |
| Scarica app | Vantaggi app, bottoni Google Play / App Store (solo smartphone), hero aggiornata |
| Accessi | UI bottoni `/accedi` aggiornata |
| Documentazione | `docs/SETUP.md`, `docs/AUTH-EMAIL-IT.md` |

---

## Da chiedere ad Associazione Zoe (bloccante)

| Tema | Cosa chiedere |
|------|----------------|
| Pagamenti | Account Stripe? Chi gestisce fatture/commissioni? Policy rimborsi? |
| Email | Mittente ufficiale (info@ / noreply@)? Testi conferma registrazione / reset password? |
| Dominio | Solo `app-zoe.vercel.app` o sotto `associazionezoe.org`? Chi gestisce DNS? |
| Team Zoe | Elenco email admin e chi approva i nuovi soci. |
| Catalogo Academy | Attività da pubblicare con prezzi ufficiali (pacchetti, mensili, corsi, online). |
| Corsi online | Link video / hosting, anteprima, durata, prezzi. |
| Tessera socio | Solo approvazione account o anche quota annuale online? Importo e regole? |
| Contenuti sito | Testi e foto definitivi: Squadra Robotica, Progetti, Carta docente, Chi siamo. |
| Legal | Testo definitivo privacy + termini / condizioni vendita (titolare Associazione Zoe). |
| Newsletter | Frequenza, chi usa l’elenco iscritti, consenso marketing. |
| WhatsApp | Confermare numero ufficiale e ruolo senza prezzo online. |
| App store | Link Play / App Store quando pronti; PWA o app nativa; account Apple/Google. |

---

## Ancora da fare (tecnico / con Zoe)

| Priorità | Voce | Dipende da |
|----------|------|------------|
| Alta | SMTP email Auth (Resend/Brevo) | Zoe: mittente + provider |
| Alta | Stripe produzione (checkout + webhook) | Zoe: account Stripe + prezzi |
| Alta | Privacy/termini definitivi | Zoe: testi legali (ora c’è bozza) |
| Media | Contenuti CMS «In costruzione» | Zoe: testi e foto |
| Media | Dominio custom + redirect Auth | Zoe: dominio |
| Media | Incollare template email IT in Supabase | Team (testi in `docs/AUTH-EMAIL-IT.md`) |
| Bassa | App nativa / store packaging | Dopo web stabile + link store Zoe |

---

## Cosa è già ok in produzione

- Academy web `/academy` e schede attività  
- Area soci + figli partecipanti  
- Admin catalogo, attivazioni, registrazioni, ingressi  
- Newsletter  
- Scarica app (pagina pronta; store link da attivare)  
- Privacy/Termini bozza  
- Deploy Vercel su https://app-zoe.vercel.app  

---

## Bozza messaggio da inviare a Zoe

Per chiudere Zoe Academy sul web ci servono da voi:

1. conferma Stripe e prezzi ufficiali  
2. email mittente e testi privacy/termini definitivi  
3. elenco attività e video online da pubblicare  
4. testi/foto per Squadra Robotica, Progetti e Carta docente  
5. chi approva i soci e quale dominio usare  
6. (quando pronti) link Google Play e App Store  

Lato tecnico abbiamo già preparato area soci, admin, newsletter, numero associato, rinnovi e pagina Scarica app.  
L’app da store la affrontiamo dopo, quando il web è stabile con i vostri contenuti e i pagamenti.

---

*Fonte: codebase App Zoe (Vite + React + Supabase + Vercel) · aggiornato dopo completamento priorità alta/media senza dati Zoe*
