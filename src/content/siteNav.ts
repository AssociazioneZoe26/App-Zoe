export type SiteLink = {
  label: string;
  to: string;
  logoSrc?: string;
  logoAlt?: string;
  children?: { label: string; to: string }[];
};

export const siteLinks: SiteLink[] = [
  { label: "Squadra di robotica", to: "/squadra-robotica" },
  {
    label: "Progetti",
    to: "/progetti/scuole",
    children: [
      { label: "Scuole", to: "/progetti/scuole" },
      { label: "Comuni", to: "/progetti/comuni" },
      { label: "Viaggi di istruzione", to: "/progetti/gite" },
      { label: "Attività estive", to: "/progetti/attivita-estive" },
    ],
  },
  { label: "Carta docente", to: "/carta-docente" },
  { label: "Chi siamo", to: "/chi-siamo" },
  { label: "Contatti", to: "/contatti" },
  { label: "Newsletter", to: "/contatti#newsletter" },
  {
    label: "Zoe Academy",
    to: "/academy",
    logoSrc: "/brand/academy-emblem.png",
    logoAlt: "Zoe Academy",
  },
];
