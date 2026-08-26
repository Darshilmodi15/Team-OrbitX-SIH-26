import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider } from "@/lib/orca/i18n";
import { SessionProvider } from "@/lib/orca/session";
import { AppProvider } from "./context/AppContext";
import LandingPage from "./pages/LandingPage";
import LanguagePage from "./pages/LanguagePage";
import AuthPage from "./pages/AuthPage";
import LocationPage from "./pages/LocationPage";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import AssistantPage from "./pages/AssistantPage";
import AlertsPage from "./pages/AlertsPage";
import ServicesPage from "./pages/ServicesPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

export default function App() {
  return (
    <AppProvider>
      <I18nProvider>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/language" element={<LanguagePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/location" element={<LocationPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Analytics />
        </SessionProvider>
      </I18nProvider>
    </AppProvider>
  );
}

