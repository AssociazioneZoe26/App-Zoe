import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { AccessPage } from "./pages/AccessPage";
import { AccountPage } from "./pages/AccountPage";
import { ActivityPage } from "./pages/ActivityPage";
import { AdminActivationsPage } from "./pages/admin/AdminActivationsPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminPassesPage } from "./pages/admin/AdminPassesPage";
import { AdminProductFormPage } from "./pages/admin/AdminProductFormPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { Catalog } from "./pages/Catalog";
import { MemberLoginPage } from "./pages/MemberLoginPage";
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
      <Route path="/accedi" element={<AccessPage />} />
      <Route path="/accedi/associati" element={<MemberLoginPage />} />
      <Route path="/accedi/associati/area" element={<AccountPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="catalogo" element={<AdminProductsPage />} />
        <Route path="catalogo/:id" element={<AdminProductFormPage />} />
        <Route path="attivazioni" element={<AdminActivationsPage />} />
        <Route path="ingressi" element={<AdminPassesPage />} />
      </Route>
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
