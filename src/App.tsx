import { Navigate, Route, Routes } from "react-router-dom";
import { AuthCallbackRedirect } from "./auth/AuthCallbackRedirect";
import { AdminLayout } from "./components/AdminLayout";
import { AccessPage } from "./pages/AccessPage";
import { AccountPage } from "./pages/AccountPage";
import { ActivityPage } from "./pages/ActivityPage";
import { AdminActivationsPage } from "./pages/admin/AdminActivationsPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminPassesPage } from "./pages/admin/AdminPassesPage";
import { AdminScanPage } from "./pages/admin/AdminScanPage";
import { AdminProductFormPage } from "./pages/admin/AdminProductFormPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { Catalog } from "./pages/Catalog";
import { ContactsPage } from "./pages/ContactsPage";
import { MemberForgotPasswordPage } from "./pages/MemberForgotPasswordPage";
import { MemberLoginPage } from "./pages/MemberLoginPage";
import { MemberRegisterPage } from "./pages/MemberRegisterPage";
import { MemberResetPasswordPage } from "./pages/MemberResetPasswordPage";
import { NewsletterConfirmPage } from "./pages/NewsletterConfirmPage";
import { AdminNewsletterPage } from "./pages/admin/AdminNewsletterPage";
import { AdminRegistrationsPage } from "./pages/admin/AdminRegistrationsPage";
import {
  CartaDocentePage,
  ChiSiamoPage,
  HomePage,
  PrivacyPage,
  ProgettiAttivitaEstivePage,
  ProgettiComuniPage,
  ProgettiGitePage,
  ProgettiScuolePage,
  ScaricaAppPage,
  SquadraRoboticaPage,
  TerminiPage,
} from "./pages/SitePages";

export default function App() {
  return (
    <>
      <AuthCallbackRedirect />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chi-siamo" element={<ChiSiamoPage />} />
      <Route path="/squadra-robotica" element={<SquadraRoboticaPage />} />
      <Route path="/progetti/scuole" element={<ProgettiScuolePage />} />
      <Route path="/progetti/comuni" element={<ProgettiComuniPage />} />
      <Route path="/progetti/gite" element={<ProgettiGitePage />} />
      <Route path="/progetti/attivita-estive" element={<ProgettiAttivitaEstivePage />} />
      <Route path="/contatti" element={<ContactsPage />} />
      <Route path="/newsletter/conferma" element={<NewsletterConfirmPage />} />
      <Route path="/carta-docente" element={<CartaDocentePage />} />
      <Route path="/scarica-app" element={<ScaricaAppPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/termini" element={<TerminiPage />} />
      <Route path="/academy" element={<Catalog />} />
      <Route path="/attivita/:slug" element={<ActivityPage />} />
      <Route path="/accedi" element={<AccessPage />} />
      <Route path="/accedi/associati" element={<MemberLoginPage />} />
      <Route path="/accedi/associati/registrati" element={<MemberRegisterPage />} />
      <Route path="/accedi/associati/recupero-password" element={<MemberForgotPasswordPage />} />
      <Route path="/accedi/associati/reimposta-password" element={<MemberResetPasswordPage />} />
      <Route path="/accedi/associati/area" element={<AccountPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="registrazioni" element={<AdminRegistrationsPage />} />
        <Route path="newsletter" element={<AdminNewsletterPage />} />
        <Route path="catalogo" element={<AdminProductsPage />} />
        <Route path="catalogo/:id" element={<AdminProductFormPage />} />
        <Route path="attivazioni" element={<AdminActivationsPage />} />
        <Route path="ingressi" element={<AdminPassesPage />} />
        <Route path="ingressi/scansiona" element={<AdminScanPage />} />
        <Route path="ingressi/socio/:email" element={<AdminPassesPage />} />
      </Route>
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
    </>
  );
}
