import { Anchor, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getStrings } from '../i18n';

export default function PrivacyPage() {
  const { currentLang } = useAppContext();
  const navigate = useNavigate();
  const t = getStrings(currentLang);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-slate-100 transition cursor-pointer">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ background: 'var(--maritime-navy)' }}>
              <Anchor className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--maritime-navy)' }}>{t.brand}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t.privacy}</h1>
        <div className="prose prose-sm prose-slate max-w-none">
          <h2>Location Data</h2>
          <p>ORCA Marine AI uses your location to determine nearby coastal conditions, safety alerts, weather information, and maritime boundaries. Location data is processed to provide accurate marine safety intelligence for your current coastal area.</p>
          <h2>Data Collection</h2>
          <p>We collect the following types of data: account information (name, email, mobile number), location coordinates, search queries and interactions with the AI assistant, and device/browser information for service optimization.</p>
          <h2>Notifications & Alerts</h2>
          <p>When enabled, ORCA may send safety alerts, weather warnings, and coastal advisories based on your location. These notifications are essential for marine safety and can be managed in your settings.</p>
          <h2>AI Responses</h2>
          <p>The AI Maritime Assistant provides information based on available data sources including INCOIS, weather services, and maritime databases. AI responses are for informational purposes and should not be the sole basis for safety-critical decisions.</p>
          <h2>Third-Party Services</h2>
          <p>ORCA uses Sarvam AI for multilingual voice and text processing, OpenMeteo for weather data, and Leaflet/OpenStreetMap for mapping services. These services may process data according to their own privacy policies.</p>
          <h2>Data Retention</h2>
          <p>Account data is retained while your account is active. Location data and query history may be retained for service improvement. You may request deletion of your data by contacting the platform administrators.</p>
          <h2>Contact</h2>
          <p>For privacy-related inquiries, please contact the ORCA Marine AI platform administrators.</p>
        </div>
      </main>
    </div>
  );
}
