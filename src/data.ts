export type Activity = {
  slug: string;
  title: string;
  eyebrow: string;
  age: string;
  category: "Corso" | "Laboratorio";
  workshop?: boolean;
  audience: "Bambini" | "Tutti";
  online: boolean;
  summary: string;
  points: string[];
  mantra: string;
  schedule?: string;
  time?: string;
  sessions?: string;
  place: string;
  phone: string;
  phoneLabel: string;
  image?: string;
  accent: "blue" | "yellow" | "teal" | "pink";
  teacher?: string;
  /** Corsi online: anteprima pubblica */
  coursePreviewVideoUrl?: string;
  coursePreviewSeconds?: number;
  /** Corsi online: un unico video completo */
  courseVideoUrl?: string;
  /** Corsi online: lezioni 1–10 (video completi) */
  courseLessons?: { title: string; url: string }[];
  fullText?: string;
  /** Scadenza del corso */
  courseDuration?: string;
  /** Inizio corso, YYYY-MM-DD */
  courseStartsOn?: string;
  /** Fine corso, YYYY-MM-DD */
  courseEndsOn?: string;
  /** Offerta unica di questa scheda */
  offer?: "packs" | "pack4" | "pack8" | "monthly" | "course";
  /** Costo pacchetto 4 ingressi (€) */
  pricePack5?: number;
  /** Costo pacchetto 8 ingressi (€) */
  pricePack10?: number;
  /** Canone mensile rinnovabile area socio (€) */
  priceMonthly?: number;
  /** Costo del corso intero (€) */
  priceCourse?: number;
};

export const activities: Activity[] = [
  {
    slug: "lego-robotica",
    title: "Corso LEGO Robotica",
    eyebrow: "Spike Essential",
    age: "7–11 anni",
    category: "Corso",
    workshop: true,
    audience: "Bambini",
    online: false,
    mantra: "Costruisci, immagina, impara",
    summary:
      "Un laboratorio pratico per sviluppare creatività, logica e collaborazione, costruendo e programmando con i mattoncini.",
    points: [
      "Lavoro di squadra e cooperazione",
      "Meccanica e robotica con Spike Essential",
      "Quattro incontri, un’ora a settimana",
    ],
    schedule: "Da mercoledì 28 ottobre",
    time: "18:15–19:15",
    sessions: "4 incontri",
    place: "Via Li Punti 12, Sassari",
    phone: "393473814081",
    phoneLabel: "347 3814081",
    image: "/corsi/lego-robotica.jpg",
    accent: "blue",
  },
  {
    slug: "laboratori-lego",
    title: "Laboratori LEGO 5–12 anni",
    eyebrow: "Costruzioni",
    age: "5–12 anni",
    category: "Laboratorio",
    audience: "Bambini",
    online: false,
    mantra: "Costruisci, immagina, impara",
    summary:
      "Attività con i mattoncini LEGO per bambini e bambine: si costruisce, si immagina e si impara insieme.",
    points: [
      "Per bambini e bambine dai 5 ai 12 anni",
      "Creatività, logica e collaborazione",
      "Attività in sede, a Li Punti",
    ],
    place: "Via Li Punti 12, Sassari",
    phone: "393473814081",
    phoneLabel: "347 3814081",
    image: "/corsi/laboratori-lego.jpg",
    accent: "yellow",
    courseDuration: "Anno scolastico",
    offer: "packs",
    pricePack5: 50,
    pricePack10: 90,
    priceMonthly: 45,
  },
  {
    slug: "coding-droni",
    title: "Coding e droni",
    eyebrow: "Corso base",
    age: "8–13 anni",
    category: "Corso",
    workshop: true,
    audience: "Bambini",
    online: false,
    mantra: "Sperimenta, impara, cresci",
    summary:
      "Logica e coding applicati a un drone vero: si impara a comandarlo programmandolo.",
    points: [
      "Laboratorio pratico di logica e coding",
      "Si comanda un drone programmandolo",
      "Quattro incontri, un’ora a settimana",
    ],
    schedule: "Da mercoledì 23 settembre",
    time: "18:15–19:15",
    sessions: "4 incontri",
    place: "Via Li Punti 12, Sassari",
    phone: "393473814081",
    phoneLabel: "347 3814081",
    image: "/corsi/coding-droni.jpg",
    accent: "yellow",
  },
  {
    slug: "informatica",
    title: "Corso di informatica",
    eyebrow: "Zoe Academy",
    age: "8–12 anni",
    category: "Corso",
    audience: "Bambini",
    online: false,
    mantra: "Scopri, crea, impara",
    summary:
      "Scopri, crea e impara con il computer, in sede a Li Punti. Due pomeriggi a settimana, con le preiscrizioni aperte.",
    points: [
      "Uso sicuro del computer",
      "Programmi e strumenti utili",
      "Creatività e progetti",
    ],
    schedule: "Martedì e giovedì",
    time: "17:00–18:00",
    place: "Via Li Punti 12, Sassari",
    phone: "393473814081",
    phoneLabel: "347 3814081",
    image: "/corsi/corso-informatica-2.jpg",
    accent: "teal",
  },
  {
    slug: "inglese",
    title: "First steps with English",
    eyebrow: "Lingua inglese",
    age: "8–12 anni",
    category: "Corso",
    audience: "Bambini",
    online: false,
    mantra: "I primi passi con l’inglese",
    summary:
      "I primi passi con la lingua inglese, in sede a Li Punti. Due pomeriggi a settimana, con le preiscrizioni aperte.",
    points: [
      "Parla, gioca e impara",
      "Vocabolario di base, su situazioni della vita quotidiana",
      "Comunicazione con sicurezza: ascolto, dialogo e conversazioni",
    ],
    schedule: "Martedì e giovedì",
    time: "17:00–18:00",
    place: "Via Li Punti 12, Sassari",
    phone: "393473814081",
    phoneLabel: "347 3814081",
    image: "/corsi/first-steps-english.jpg",
    accent: "yellow",
  },
  {
    slug: "lis",
    title: "Avvicinamento alla LIS",
    eyebrow: "Edizione online · Livello 0",
    age: "Aperto a tutti",
    category: "Corso",
    workshop: true,
    audience: "Tutti",
    online: true,
    mantra: "Impara una nuova lingua",
    summary:
      "Venti ore online per scoprire la Lingua dei Segni Italiana da zero, senza prerequisiti.",
    points: [
      "Aperto a curiosi e a chi parte da zero",
      "Venti ore di formazione online",
      "Per abbattere le barriere e imparare una lingua nuova",
    ],
    sessions: "20 ore",
    place: "Online",
    phone: "393515054315",
    phoneLabel: "351 5054315",
    image: "/corsi/lis.jpg",
    accent: "pink",
    teacher: "Dott.ssa Silvia Siskova",
  },
];

export const activityFilters = [
  { id: "tutte", label: "Attività" },
  { id: "laboratorio", label: "Laboratori" },
  { id: "corso", label: "Corsi" },
  { id: "workshop", label: "Workshop" },
  { id: "online", label: "Online" },
] as const;

export type FilterId = (typeof activityFilters)[number]["id"];

export function getActivity(slug: string | undefined) {
  return activities.find((activity) => activity.slug === slug);
}

export function whatsappHref(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function activityWhatsapp(activity: Activity) {
  return whatsappHref(
    activity.phone,
    `Ciao, vorrei informazioni su ${activity.title}.`,
  );
}

export const deskPhone = {
  phone: "393473814081",
  label: "347 3814081",
};

export const generalWhatsapp = whatsappHref(
  deskPhone.phone,
  "Ciao, vorrei informazioni sulle attività di Associazione Zoe.",
);

/** Link WhatsApp Associazione Zoe (stesso numero della sede). */
export const whatsappChannel = generalWhatsapp;
