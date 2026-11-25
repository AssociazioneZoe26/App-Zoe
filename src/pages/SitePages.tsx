import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ContentPage } from "../components/ContentPage";
import { Layout } from "../components/Layout";
import type { SitePage } from "../content/pages";
import { getResolvedSitePage, loadSitePage } from "../content/siteCmsStore";

function SitePageLoader({ slug }: { slug: string }) {
  const seed = getResolvedSitePage(slug);
  const [page, setPage] = useState<SitePage | undefined>(seed);
  const [ready, setReady] = useState(!isLikelyRemoteNeeded());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await loadSitePage(slug);
      if (cancelled) return;
      setPage(remote);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!seed && ready && !page) return <Navigate to="/" replace />;
  if (!page) {
    return (
      <Layout variant="site">
        <section className="missing">
          <p className="lede">Caricamento…</p>
        </section>
      </Layout>
    );
  }

  return <ContentPage page={page} pageKey={`${slug}-${ready ? "live" : "cache"}`} />;
}

function isLikelyRemoteNeeded() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL);
}

export function HomePage() {
  return <SitePageLoader slug="home" />;
}

export function ChiSiamoPage() {
  return <SitePageLoader slug="chi-siamo" />;
}

export function SquadraRoboticaPage() {
  return <SitePageLoader slug="squadra-robotica" />;
}

export function ProgettiScuolePage() {
  return <SitePageLoader slug="progetti-scuole" />;
}

export function ProgettiComuniPage() {
  return <SitePageLoader slug="progetti-comuni" />;
}

export function ProgettiGitePage() {
  return <SitePageLoader slug="progetti-gite" />;
}

export function ProgettiAttivitaEstivePage() {
  return <SitePageLoader slug="progetti-attivita-estive" />;
}

export function CartaDocentePage() {
  return <SitePageLoader slug="carta-docente" />;
}

export function ScaricaAppPage() {
  return <SitePageLoader slug="scarica-app" />;
}

export function PrivacyPage() {
  return <SitePageLoader slug="privacy" />;
}

export function TerminiPage() {
  return <SitePageLoader slug="termini" />;
}
