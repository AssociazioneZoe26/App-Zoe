export type ContentSection = {
  title?: string;
  body: string;
  image?: string;
  imageAlt?: string;
};

export type ContentVideo = {
  title: string;
  src: string;
  poster?: string;
};

export type HomePreview = {
  title: string;
  body: string;
  to: string;
  cta: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: "top" | "center" | "bottom";
  imageFit?: "cover" | "natural";
};

export type SitePage = {
  slug: string;
  title: string;
  documentTitle: string;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  /** Allinea la foto hero (es. top per non tagliare i volti). */
  heroImagePosition?: "top" | "center" | "bottom";
  sections: ContentSection[];
  videos: ContentVideo[];
  previews?: HomePreview[];
};

export const sitePages: Record<string, SitePage> = {
  home: {
    slug: "home",
    title: "Home",
    documentTitle: "Zoe · Associazione",
    heroTitle: "Costruisci. Immagina. Impara.",
    heroText:
      "Associazione no profit a Li Punti, Sassari. Educazione, arte, robotica, tempo libero e progetti per bambini e adulti.",
    heroImage: "/site/home-hero.jpg",
    sections: [],
    videos: [],
    previews: [
      {
        title: "Chi siamo",
        body: "Zoe è un’associazione no profit. Si dedica a migliorare la qualità della vita dei soci, dai bambini agli adulti, senza limiti d’età: nel tempo libero, con il gioco e con attività ludiche ed educative.\n\nOgni persona ha talenti e risorse da far emergere, per il lavoro, la famiglia, le relazioni e la comunità. In sede i corsi e i laboratori fanno sperimentare logica, creatività, manualità e pensiero computazionale.",
        to: "/chi-siamo",
        cta: "Scopri Chi siamo",
        image: "/site/chi-siamo.jpg",
        imageAlt: "Team Zoe Sassari con il premio Coach/Mentore FIRST LEGO League",
        imagePosition: "top",
      },
      {
        title: "Zoe Academy",
        body: "L’offerta formativa in sede e online: LEGO Robotica, Laboratori LEGO, Laboratori di robotica, Coding e droni, Informatica, inglese, Avvicinamento alla LIS, pittura e percorsi STEM. Corsi, laboratori e workshop per bambini, ragazzi e adulti.",
        to: "/academy",
        cta: "Vai a Zoe Academy",
        image: "/site/zoe-academy.jpg",
        imageAlt: "Emblema Zoe Academy",
        imageFit: "natural",
      },
      {
        title: "Squadra Robotica",
        body: "Testo placeholder. Qui presenteremo la squadra, gli allenamenti e le gare di robotica.",
        to: "/squadra-robotica",
        cta: "Scopri la Squadra",
        image: "/site/squadra-robotica.jpg",
        imageAlt: "Team Zoe Sassari, squadra di robotica",
        imagePosition: "top",
      },
      {
        title: "Progetti",
        body: "Sei una scuola della Sardegna? Un comune che vuole organizzare corsi o attività? Zoe collabora con le scuole e i comuni sul territorio e organizza gite e uscite formative. Percorsi educativi, iniziative condivise e esperienze fuori sede per bambini, ragazzi e comunità.",
        to: "/progetti/scuole",
        cta: "Vedi i progetti",
        image: "/site/progetti.jpg",
        imageAlt: "Ragazzi con un robot durante un progetto Zoe",
        imageFit: "natural",
      },
      {
        title: "Carta docente",
        body: "Bonus da 500 euro del Ministero dell’Istruzione per i docenti di ruolo: aggiornamento professionale, anche digitale. Si può spendere presso esercenti ed enti di formazione fisici e online — libri e device informatici, anche su Amazon. Con Zoe per corsi e formazione STEM a Li Punti.",
        to: "/carta-docente",
        cta: "Scopri di più",
        image: "/site/carta-docente.jpg",
        imageAlt: "Carta del Docente · Formazione e crescita con Zoe",
        imageFit: "natural",
      },
    ],
  },
  "chi-siamo": {
    slug: "chi-siamo",
    title: "Chi siamo",
    documentTitle: "Chi siamo · Zoe",
    heroTitle: "Zoe significa\nnuova vita.",
    heroText:
      "Zoe è un’associazione no profit. Si dedica a migliorare la qualità della vita dei soci, dai bambini agli adulti, senza limiti d’età: nel tempo libero, con il gioco e con attività ludiche ed educative.",
    heroImage: "/site/chi-siamo.jpg",
    heroImagePosition: "top",
    sections: [
      {
        title: "Talenti e crescita",
        body: "Ogni persona ha talenti e risorse da far emergere, per il lavoro, la famiglia, le relazioni e la comunità. In sede i corsi e i laboratori fanno sperimentare logica, creatività, manualità e pensiero computazionale. Oggi ci sono robotica e LEGO, coding e droni, informatica, inglese e pittura. Online, l’avvicinamento alla LIS è aperto a tutte le età.",
      },
      {
        title: "Solidarietà",
        body: "Durante l’anno ogni socio può seguire corsi, laboratori ed eventi a Li Punti. Zoe crede nella solidarietà: la quota inclusa nella tessera sostiene i progetti sociali e aiuta la comunità contro isolamento e solitudine. L’iscrizione resta in associazione.",
      },
    ],
    videos: [],
  },
  "squadra-robotica": {
    slug: "squadra-robotica",
    title: "Squadra Robotica",
    documentTitle: "Squadra Robotica · Zoe",
    heroTitle: "Squadra Robotica.",
    heroText:
      "Allenamento, progettazione e gare: la squadra di robotica di Zoe. I testi, le foto e i video di questa pagina li aggiorna Zoe dall’admin.",
    heroImage: "/corsi/laboratori-robotica.jpg",
    sections: [
      {
        title: "In costruzione",
        body: "Qui Zoe pubblicherà aggiornamenti sulla squadra, i percorsi e gli eventi. Aggiungi testi, immagini e video dall’area admin quando saranno pronti.",
        image: "/corsi/lego-robotica.jpg",
        imageAlt: "Locandina robotica",
      },
    ],
    videos: [],
  },
  "progetti-scuole": {
    slug: "progetti-scuole",
    title: "Progetti · Scuole",
    documentTitle: "Progetti scuole · Zoe",
    heroTitle: "Progetti con le scuole.",
    heroText:
      "Collaborazioni e percorsi educativi con le scuole. Contenuti aggiornabili da Zoe: testi, immagini e video.",
    heroImage: "/hero/laboratorio.jpg",
    sections: [
      {
        title: "In costruzione",
        body: "Questa sezione ospiterà i progetti realizzati o in corso con le scuole. Zoe potrà modificarla dall’admin.",
      },
    ],
    videos: [],
  },
  "progetti-comuni": {
    slug: "progetti-comuni",
    title: "Progetti · Comuni",
    documentTitle: "Progetti comuni · Zoe",
    heroTitle: "Progetti con i comuni.",
    heroText:
      "Iniziative e percorsi sul territorio con i comuni. Testi, immagini e video aggiornabili dall’admin.",
    heroImage: "/corsi/academy-panorama.jpg",
    sections: [
      {
        title: "In costruzione",
        body: "Qui Zoe racconterà i progetti con i comuni. I contenuti si aggiornano dall’area admin.",
      },
    ],
    videos: [],
  },
  "progetti-gite": {
    slug: "progetti-gite",
    title: "Progetti · Gite",
    documentTitle: "Gite · Zoe",
    heroTitle: "Gite e uscite.",
    heroText:
      "Uscite e gite organizzate da Zoe. Foto, racconti e video si aggiornano dall’admin.",
    heroImage: "/hero/laboratorio-2.jpg",
    sections: [
      {
        title: "In costruzione",
        body: "Questa pagina raccoglierà le gite e le uscite. Zoe potrà pubblicare testi, immagini e video dall’admin.",
      },
    ],
    videos: [],
  },
  "carta-docente": {
    slug: "carta-docente",
    title: "Carta docente",
    documentTitle: "Carta docente · Zoe",
    heroTitle: "Carta del docente.",
    heroText:
      "Informazioni sull’uso della Carta del docente con Zoe. I dettagli li aggiorna Zoe dall’admin.",
    heroImage: "/corsi/corso-informatica-2.jpg",
    sections: [
      {
        title: "In costruzione",
        body: "Qui troverai le indicazioni per la Carta del docente. Contattaci in sede o su WhatsApp per conferma; Zoe completerà i testi da admin.",
      },
    ],
    videos: [],
  },
  "scarica-app": {
    slug: "scarica-app",
    title: "Scarica l’app",
    documentTitle: "Scarica l’app · Zoe",
    heroTitle: "L’app di Zoe.",
    heroText:
      "Presto l’area soci e le attività saranno anche in un’app da scaricare. Intanto puoi usare Zoe Academy dal browser e accedere come socio.",
    heroImage: "/hero/laboratorio.jpg",
    sections: [
      {
        title: "In arrivo",
        body: "Quando l’app sarà pubblicata su App Store e Play, i link di download compariranno qui. Zoe aggiornerà questa pagina dall’admin.",
      },
    ],
    videos: [],
  },
};

export function getSitePage(slug: string) {
  return sitePages[slug];
}
