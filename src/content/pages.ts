export type ContentSection = {
  title?: string;
  body: string;
  image?: string;
  imageAlt?: string;
  cta?: string;
  ctaTo?: string;
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
        title: "Squadra di robotica",
        body: "Testo placeholder. Qui presenteremo la squadra, gli allenamenti e le gare di robotica.",
        to: "/squadra-robotica",
        cta: "Scopri la Squadra",
        image: "/site/squadra-robotica.jpg",
        imageAlt: "Team Zoe Sassari, squadra di robotica",
        imagePosition: "top",
      },
      {
        title: "Progetti",
        body: "Sei una scuola della Sardegna? Un comune che vuole organizzare corsi o attività? Zoe collabora con le scuole e i comuni sul territorio, organizza viaggi di istruzione e attività estive. Percorsi educativi, iniziative condivise e esperienze fuori sede per bambini, ragazzi e comunità.",
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
    title: "Squadra di robotica",
    documentTitle: "Squadra di robotica · Zoe",
    heroTitle: "Squadra di robotica.",
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
    title: "Progetti · Viaggi di istruzione",
    documentTitle: "Viaggi di istruzione · Zoe",
    heroTitle: "Viaggi di istruzione.",
    heroText:
      "Uscite formative e viaggi di istruzione organizzati da Zoe. Foto, racconti e video si aggiornano dall’admin.",
    heroImage: "/hero/laboratorio-2.jpg",
    sections: [
      {
        title: "In costruzione",
        body: "Questa pagina raccoglierà i viaggi di istruzione e le uscite. Zoe potrà pubblicare testi, immagini e video dall’admin.",
      },
    ],
    videos: [],
  },
  "progetti-attivita-estive": {
    slug: "progetti-attivita-estive",
    title: "Progetti · Attività estive",
    documentTitle: "Attività estive · Zoe",
    heroTitle: "Attività estive.",
    heroText:
      "Estate con Zoe: campi, laboratori e settimane per bambini e ragazzi. Testi, foto e video si aggiornano dall’admin.",
    heroImage: "/hero/laboratorio.jpg",
    sections: [
      {
        title: "Settimane estive in sede",
        body: "Giornate in associazione a Li Punti: laboratori, gioco, STEM e tempo insieme. Calendario, orari e posti si confermano in sede.",
        image: "/site/progetti.jpg",
        imageAlt: "Ragazzi durante un’attività Zoe",
        cta: "Contattaci",
        ctaTo: "/contatti",
      },
      {
        title: "Laboratori d’estate",
        body: "Robotica, coding, arte e attività all’aperto per bambini e ragazzi. Per maggiori informazioni, posti e iscrizioni scrivi a Team Zoe.",
        image: "/hero/laboratorio-2.jpg",
        imageAlt: "Laboratorio estivo Zoe",
        cta: "Contattaci",
        ctaTo: "/contatti",
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
      "Porta Zoe Academy sempre con te: area soci, corsi e aggiornamenti a portata di tap. Disponibile su smartphone da Google Play e App Store.",
    heroImage: "/site/scarica-app-hero.jpg",
    heroImagePosition: "center",
    sections: [
      {
        title: "Perché scaricare l’app",
        body: "Con l’app segui le tue attività in modo più semplice e resti aggiornata/o senza dover aprire il sito ogni volta. È pensata per lo smartphone: rapida, chiara e sempre a disposizione.",
      },
      {
        title: "Notifiche utili",
        body: "Ricevi un avviso quando un abbonamento sta per scadere e quando gli ingressi del pacchetto stanno per finire, così puoi rinnovare in tempo e non perdere le lezioni.",
      },
      {
        title: "Tutto a portata di mano",
        body: "Consulta i tuoi corsi, i partecipanti e le scadenze dall’area soci. Novità, laboratori e comunicazioni di Associazione Zoe arrivano direttamente sul telefono.",
      },
    ],
    videos: [],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy",
    documentTitle: "Informativa privacy · Zoe",
    heroTitle: "Informativa privacy.",
    heroText:
      "Come Associazione Zoe tratta i dati personali su questo sito e nell’area soci. Testo bozza da validare con Zoe.",
    heroImage: "/site/chi-siamo.jpg",
    sections: [
      {
        title: "Titolare del trattamento",
        body: "Associazione Zoe, Via Li Punti 12, 07100 Sassari. Contatto: info@associazionezoe.org · 347 3814081.",
      },
      {
        title: "Dati trattati",
        body: "Dati di registrazione socio (nome, email, password), stato di iscrizione, partecipanti collegati all’account, iscrizioni a corsi e pacchetti, richieste di rinnovo, iscrizione newsletter (nome ed email), dati tecnici di navigazione e log di sicurezza.",
      },
      {
        title: "Finalità e base giuridica",
        body: "Gestione dell’associazione e dell’area soci (contratto/adesione); erogazione di corsi, laboratori e contenuti online; comunicazioni operative; newsletter e marketing solo con consenso; obblighi di legge e sicurezza del servizio.",
      },
      {
        title: "Conservazione e diritti",
        body: "I dati sono conservati per il tempo necessario alle finalità indicate e agli obblighi di legge. Puoi richiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità scrivendo a info@associazionezoe.org. Hai diritto di reclamare al Garante Privacy.",
      },
      {
        title: "Nota",
        body: "Questa pagina è una bozza operativa. Zoe completerà e validerà il testo definitivo prima del go-live completo.",
      },
    ],
    videos: [],
  },
  termini: {
    slug: "termini",
    title: "Termini",
    documentTitle: "Termini di utilizzo · Zoe",
    heroTitle: "Termini di utilizzo.",
    heroText:
      "Condizioni di uso del sito, dell’area soci e dei servizi Academy. Testo bozza da validare con Zoe.",
    heroImage: "/site/zoe-academy.jpg",
    sections: [
      {
        title: "Servizio",
        body: "Il sito e l’area soci consentono di consultare le attività di Associazione Zoe, gestire l’account socio, i partecipanti e le iscrizioni a corsi, laboratori e contenuti online.",
      },
      {
        title: "Account socio",
        body: "La registrazione richiede dati veritieri e l’accettazione dell’informativa privacy. L’accesso all’area riservata può richiedere conferma email e approvazione di Team Zoe. Le credenziali sono personali.",
      },
      {
        title: "Attività e pagamenti",
        body: "Prezzi, posti e calendari sono indicati nelle schede prodotto. Fino all’attivazione dei pagamenti online, iscrizioni e rinnovi possono essere gestiti in sede o su WhatsApp. I rimborsi seguono le regole comunicate da Zoe per ogni attività.",
      },
      {
        title: "Contenuti online",
        body: "I video e i materiali dei corsi online sono riservati ai soci con accesso attivo. È vietata la condivisione non autorizzata delle credenziali o dei contenuti.",
      },
      {
        title: "Nota",
        body: "Questa pagina è una bozza operativa. Zoe completerà condizioni di vendita e policy di rimborso definitive.",
      },
    ],
    videos: [],
  },
};

export function getSitePage(slug: string) {
  return sitePages[slug];
}
