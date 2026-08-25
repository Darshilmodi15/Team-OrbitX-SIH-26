import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import LocationPage from './pages/LocationPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import OnboardingFlow from './components/OnboardingFlow';

function AppRoutes() {
  const { hasCompletedOnboarding } = useAppContext();

  return (
    <Routes>
      {/* Root Route: If onboarding completed, go to Landing or Dashboard; otherwise Onboarding flow */}
      <Route
        path="/"
        element={
          hasCompletedOnboarding ? <LandingPage /> : <OnboardingFlow />
        }
      />
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/home" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/location" element={<LocationPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
