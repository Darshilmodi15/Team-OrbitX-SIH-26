import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import LocationPage from './pages/LocationPage';
import DashboardPage from './pages/DashboardPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
