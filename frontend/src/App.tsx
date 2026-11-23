import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { I18nProvider } from "@/lib/orca/i18n";
import { SessionProvider, useSession } from "@/lib/orca/session";
import { MarineSnapshotProvider } from "@/lib/orca/snapshot";
import { ThemeProvider } from "@/lib/orca/theme";
import { CookieBanner } from "./components/CookieBanner";
import { RouteAnalyticsListener } from "./lib/orca/analytics";
import { MatsyaLoader } from "./components/orca/MatsyaLoader";
import { LocationGate } from "./components/orca/LocationGate";
import { ServiceState } from "./components/orca/ServiceState";
import { RouteScrollReset } from "./components/orca/RouteScrollReset";

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
const ThankYouPage = lazy(() => import("./pages/ThankYouPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));

function RouteFallback() {
  return <MatsyaLoader variant="fullscreen" />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, ready, sessionExpired, sessionError, retrySession } = useSession();
  if (sessionExpired) return <ServiceState kind="expired" />;
  if (sessionError) return <ServiceState retry={retrySession} />;
  if (!ready) return <RouteFallback />;
  return user ? children : <Navigate to="/login" state={{ from: pathname }} replace />;
}

function RoleRoute({ roles, children }: { roles: Array<"user" | "government" | "admin">; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user, ready, sessionExpired, sessionError, retrySession } = useSession();
  if (sessionExpired) return <ServiceState kind="expired" />;
  if (sessionError) return <ServiceState retry={retrySession} />;
  if (!ready) return <RouteFallback />;
  if (!user) return <Navigate to="/login" state={{ from: pathname }} replace />;
  return roles.includes(user.role) ? children : <Navigate to="/dashboard" replace />;
}

function DashboardRoute() {
  const { user, ready, sessionExpired, sessionError, retrySession } = useSession();
  if (sessionExpired) return <ServiceState kind="expired" />;
  if (sessionError) return <ServiceState retry={retrySession} />;
  if (!ready) return <RouteFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "government") return <Navigate to="/officer" replace />;
  return <LocationGate><DashboardPage /></LocationGate>;
}

function ConsentedAnalytics() {
  const read = () => { try { return JSON.parse(localStorage.getItem("orca_cookie_consent") || "null")?.analytics === true; } catch { return false; } };
  const [allowed, setAllowed] = useState(read);
  useEffect(() => { const update = () => setAllowed(read()); window.addEventListener("orca:consent-changed", update); window.addEventListener("storage", update); return () => { window.removeEventListener("orca:consent-changed", update); window.removeEventListener("storage", update); }; }, []);
  return allowed ? <><Analytics /><SpeedInsights /></> : null;
}
export default function App() {
  return (
    <ThemeProvider>
        <I18nProvider>
          <SessionProvider>
          <MarineSnapshotProvider>
            <BrowserRouter>
              <RouteAnalyticsListener />
              <Suspense fallback={<RouteFallback />}>
                <RouteScrollReset />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/language" element={<LanguagePage />} />
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/location" element={<ProtectedRoute><LocationPage /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<DashboardRoute />} />
                  <Route path="/officer" element={<RoleRoute roles={["government"]}><OperationsPage /></RoleRoute>} />
                  <Route path="/admin" element={<RoleRoute roles={["admin"]}><OperationsPage /></RoleRoute>} />
                  <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/map" element={<ProtectedRoute><LocationGate><MapPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/assistant" element={<ProtectedRoute><LocationGate><AssistantPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/assistant/c/:conversationId" element={<ProtectedRoute><LocationGate><AssistantPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/c/:conversationId" element={<ProtectedRoute><LocationGate><AssistantPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/alerts" element={<ProtectedRoute><LocationGate><AlertsPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/services" element={<ProtectedRoute><LocationGate><ServicesPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/emergency" element={<ProtectedRoute><LocationGate><ServicesPage /></LocationGate></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/thank-you" element={<ThankYouPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
              <CookieBanner />
            </BrowserRouter>
            <ConsentedAnalytics />
          </MarineSnapshotProvider>
          </SessionProvider>
        </I18nProvider>
    </ThemeProvider>
  );
}
