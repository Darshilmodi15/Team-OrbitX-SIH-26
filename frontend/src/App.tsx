import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider } from "@/lib/orca/i18n";
import { SessionProvider } from "@/lib/orca/session";
import { ThemeProvider } from "@/lib/orca/theme";
import { AppProvider } from "./context/AppContext";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LanguagePage = lazy(() => import("./pages/LanguagePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const LocationPage = lazy(() => import("./pages/LocationPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm font-medium text-muted-foreground">
      Loading ORCA...
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <I18nProvider>
          <SessionProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            <Analytics />
          </SessionProvider>
        </I18nProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
