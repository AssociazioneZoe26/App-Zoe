import { Route, Routes } from "react-router-dom";
import { AccountPage } from "./pages/AccountPage";
import { ActivityPage } from "./pages/ActivityPage";
import { Catalog } from "./pages/Catalog";
import {
  CartaDocentePage,
  ChiSiamoPage,
  HomePage,
  ProgettiComuniPage,
  ProgettiGitePage,
  ProgettiScuolePage,
  ScaricaAppPage,
  SquadraRoboticaPage,
} from "./pages/SitePages";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chi-siamo" element={<ChiSiamoPage />} />
      <Route path="/squadra-robotica" element={<SquadraRoboticaPage />} />
      <Route path="/progetti/scuole" element={<ProgettiScuolePage />} />
      <Route path="/progetti/comuni" element={<ProgettiComuniPage />} />
      <Route path="/progetti/gite" element={<ProgettiGitePage />} />
      <Route path="/carta-docente" element={<CartaDocentePage />} />
      <Route path="/scarica-app" element={<ScaricaAppPage />} />
      <Route path="/academy" element={<Catalog />} />
      <Route path="/attivita/:slug" element={<ActivityPage />} />
      <Route path="/accedi" element={<AccountPage />} />
    </Routes>
  );
}
