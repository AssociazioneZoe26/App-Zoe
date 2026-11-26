import type { CSSProperties, ReactNode } from "react";

export type AdminMenuTone = CSSProperties & {
  "--menu-color": string;
  "--menu-ink": string;
};

export type AdminMenuItem = {
  id: string;
  /** Titolo del bottone in dashboard. */
  label: string;
  /** Voce nel menu, se è più corta del titolo. */
  navLabel?: string;
  href: string;
  end?: boolean;
  description: string;
  action: string;
  color: string;
  ink: string;
  icon: ReactNode;
  /** Compare nel menu in alto. Le pagine del sito restano solo in dashboard. */
  nav?: boolean;
  /** Compare tra i bottoni della dashboard. */
  dashboard?: boolean;
};

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const adminMenu: AdminMenuItem[] = [
  {
    id: "registrazioni",
    label: "Richieste di registrazione",
    navLabel: "Registrazioni",
    href: "/admin/registrazioni",
    description: "Approva, rifiuta, sospendi o riattiva i nuovi soci in attesa.",
    action: "Apri richieste",
    color: "#e30613",
    ink: "#fffdf9",
    nav: true,
    dashboard: true,
    icon: (
      <Glyph>
        <circle cx="9" cy="8" r="3" {...stroke} />
        <path d="M3.8 19.2c.6-3 2.6-4.6 5.2-4.6s4.6 1.6 5.2 4.6" {...stroke} />
        <path d="M17 8.5v5M14.5 11h5" {...stroke} />
      </Glyph>
    ),
  },
  {
    id: "catalogo",
    label: "Catalogo Academy",
    navLabel: "Catalogo",
    href: "/admin/catalogo",
    description: "Laboratori, corsi, workshop e online — separato dal sito, pronto per la futura app.",
    action: "Apri catalogo",
    color: "#0c7c86",
    ink: "#fffdf9",
    nav: true,
    dashboard: true,
    icon: (
      <Glyph>
        <rect x="3.5" y="4" width="7" height="7" rx="1.6" {...stroke} />
        <rect x="13.5" y="4" width="7" height="7" rx="1.6" {...stroke} />
        <rect x="3.5" y="14" width="7" height="6" rx="1.6" {...stroke} />
        <rect x="13.5" y="14" width="7" height="6" rx="1.6" {...stroke} />
      </Glyph>
    ),
  },
  {
    id: "attivazioni",
    label: "Attivazioni",
    href: "/admin/attivazioni",
    description: "Attiva un prodotto per un socio dopo pagamento in persona.",
    action: "Attiva socio",
    color: "#ffd000",
    ink: "#142c86",
    nav: true,
    dashboard: true,
    icon: (
      <Glyph>
        <circle cx="12" cy="12" r="8" {...stroke} />
        <path d="m8.4 12.2 2.4 2.4 4.8-5.2" {...stroke} />
      </Glyph>
    ),
  },
  {
    id: "ingressi",
    label: "Ingressi",
    href: "/admin/ingressi",
    end: true,
    description: "Lista soci con pacchetti laboratorio da 4 o 8 ingressi.",
    action: "Apri lista associati",
    color: "#1f8a4c",
    ink: "#fffdf9",
    nav: true,
    dashboard: true,
    icon: (
      <Glyph>
        <path
          d="M5 7.5h14v3.2a2.2 2.2 0 0 0 0 4.1V18H5v-3.2a2.2 2.2 0 0 0 0-4.1z"
          {...stroke}
        />
        <path d="M12 8.2v7.6" {...stroke} />
      </Glyph>
    ),
  },
  {
    id: "scansiona",
    label: "Scansiona ingresso",
    href: "/admin/ingressi/scansiona",
    description: "Segna un ingresso dal QR del pacchetto.",
    action: "Apri scanner",
    color: "#f26b21",
    ink: "#fffdf9",
    nav: true,
    icon: (
      <Glyph>
        <path d="M5 5h5.2v5.2H5zM13.8 5H19v5.2h-5.2zM5 13.8h5.2V19H5z" {...stroke} />
        <path d="M13.8 13.8h2.2v2.2h-2.2zM18 14.2V19h-4.2v-2" {...stroke} />
      </Glyph>
    ),
  },
  {
    id: "newsletter",
    label: "Newsletter",
    href: "/admin/newsletter",
    description: "Unica lista iscritti e bozza del riepilogo corsi ogni due settimane.",
    action: "Apri newsletter",
    color: "#d62b78",
    ink: "#fffdf9",
    nav: true,
    dashboard: true,
    icon: (
      <Glyph>
        <rect x="3.5" y="6" width="17" height="12" rx="2" {...stroke} />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" {...stroke} />
      </Glyph>
    ),
  },
  {
    id: "sito",
    label: "Pagine del sito",
    href: "/",
    description:
      "Home, Chi siamo, Squadra, Progetti, Carta docente: modifica testi e immagini in pagina.",
    action: "Apri il sito",
    color: "#1b45d6",
    ink: "#fffdf9",
    dashboard: true,
    icon: (
      <Glyph>
        <path d="M6 4.5h8.2L18.5 9v10.5H6z" {...stroke} />
        <path d="M14 4.5V9h4.5" {...stroke} />
        <path d="M9 12.5h6M9 16h4" {...stroke} />
      </Glyph>
    ),
  },
];

export function menuTone(item: Pick<AdminMenuItem, "color" | "ink">): AdminMenuTone {
  return { "--menu-color": item.color, "--menu-ink": item.ink };
}

export const dashboardMenu = adminMenu.filter((item) => item.dashboard);
export const navMenu = adminMenu.filter((item) => item.nav);
