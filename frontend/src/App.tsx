import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider } from "@/lib/orca/i18n";
import { SessionProvider, useSession } from "@/lib/orca/session";
import { ThemeProvider } from "@/lib/orca/theme";
import { AppProvider } from "./context/AppContext";
import { CookieBanner } from "./components/CookieBanner";
import { RouteAnalyticsListener } from "./lib/orca/analytics";
import { OrcaLogo } from "./components/orca/Logo";
import { Radio } from "lucide-react";

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

function RouteFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#06182C] px-4 text-slate-100 selection:bg-teal-500/30">
      <div className="relative flex size-20 items-center justify-center rounded-3xl bg-slate-900/90 border border-teal-500/30 shadow-2xl shadow-teal-500/20 backdrop-blur-xl">
        <OrcaLogo className="size-10 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)] animate-pulse" />
        <div className="absolute -inset-1 rounded-3xl border border-teal-500/20 animate-ping opacity-40 pointer-events-none" />
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-teal-300">
        <Radio className="size-3.5 text-teal-400 animate-pulse" />
        <span>INITIALIZING OCEAN TELEMETRY...</span>
      </div>

      <div className="mt-3 h-1 w-36 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-full bg-gradient-to-r from-teal-500 via-sky-400 to-teal-500 animate-[shimmer_1.5s_infinite_linear] [background-size:200%_100%]" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  if (!ready) return <RouteFallback />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <I18nProvider>
          <SessionProvider>
            <BrowserRouter>
              <RouteAnalyticsListener />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/language" element={<LanguagePage />} />
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/location" element={<ProtectedRoute><LocationPage /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
                  <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
                  <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
                  <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/thank-you" element={<ThankYouPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
              <CookieBanner />
            </BrowserRouter>
            <Analytics />
          </SessionProvider>
        </I18nProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
