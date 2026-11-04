import { Navigate } from "react-router-dom";
import { ContentPage } from "../components/ContentPage";
import { getResolvedSitePage } from "../content/siteCmsStore";

function pageOrHome(slug: string) {
  const page = getResolvedSitePage(slug);
  if (!page) return <Navigate to="/" replace />;
  return <ContentPage page={page} />;
}

export function HomePage() {
  return pageOrHome("home");
}

export function ChiSiamoPage() {
  return pageOrHome("chi-siamo");
}

export function SquadraRoboticaPage() {
  return pageOrHome("squadra-robotica");
}

export function ProgettiScuolePage() {
  return pageOrHome("progetti-scuole");
}

export function ProgettiComuniPage() {
  return pageOrHome("progetti-comuni");
}

export function ProgettiGitePage() {
  return pageOrHome("progetti-gite");
}

export function CartaDocentePage() {
  return pageOrHome("carta-docente");
}

export function ScaricaAppPage() {
  return pageOrHome("scarica-app");
}
