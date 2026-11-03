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

export type SitePage = {
  slug: string;
  title: string;
  documentTitle: string;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  sections: ContentSection[];
  videos: ContentVideo[];
};

export const sitePages: Record<string, SitePage> = {
  home: {
    slug: "home",
    title: "Home",
    documentTitle: "Zoe · Associazione",
    heroTitle: "Costruisci. Immagina. Impara.",
    heroText:
      "Associazione no profit a Li Punti, Sassari. Educazione, arte, robotica, tempo libero e progetti per bambini e adulti.",
    heroImage: "/hero/laboratorio.jpg",
    sections: [
      {
        title: "Benvenuti in Zoe",
        body: "Zoe significa nuova vita. Qui trovi i corsi e i laboratori di Zoe Academy, la squadra di robotica, i progetti con scuole e comuni e le gite. I contenuti di questa pagina si aggiornano dall’area admin.",
        image: "/hero/laboratorio-2.jpg",
        imageAlt: "Bambini impegnati in un laboratorio",
      },
      {
        title: "Zoe Academy",
        body: "Nell’area Academy trovi le attività in corso: robotica e LEGO, coding e droni, informatica, inglese e LIS. Scegli un’attività e scrivi a Zoe su WhatsApp. L’iscrizione resta in associazione.",
      },
    ],
    videos: [],
  },
  "chi-siamo": {
    slug: "chi-siamo",
    title: "Chi siamo",
    documentTitle: "Chi siamo · Zoe",
    heroTitle: "Zoe significa nuova vita.",
    heroText:
      "Un’associazione no profit che migliora la qualità della vita dei soci, dai bambini agli adulti, con gioco, educazione e solidarietà.",
    heroImage: "/hero/laboratorio-2.jpg",
    sections: [
      {
        title: "Talenti e crescita",
        body: "Ogni persona ha talenti e risorse da far emergere, per il lavoro, la famiglia, le relazioni e la comunità. In sede i corsi e i laboratori fanno sperimentare logica, creatività, manualità e pensiero computazionale.",
        image: "/corsi/academy-panorama.jpg",
        imageAlt: "Attività in sede a Zoe",
      },
      {
        title: "Solidarietà",
        body: "Durante l’anno ogni socio può seguire corsi, laboratori ed eventi a Li Punti. La quota inclusa nella tessera sostiene i progetti sociali e aiuta la comunità contro isolamento e solitudine. L’iscrizione resta in associazione.",
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
