import { Anchor, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { getStrings } from '../i18n';

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t.terms}</h1>
        <div className="prose prose-sm prose-slate max-w-none">
          <h2>Service Description</h2>
          <p>ORCA Marine AI is a National Coastal Safety & Decision Intelligence Platform that provides real-time coastal intelligence, marine safety alerts, weather awareness, and AI-assisted decision support for India's coastal communities.</p>
          <h2>Acceptable Use</h2>
          <p>The platform is intended for use by fishermen, coastal residents, coastal travelers, government authorities, and emergency response personnel along India's coastline. Use of the platform outside the supported Indian coastal operational area is not supported.</p>
          <h2>Safety Limitations</h2>
          <p>Marine conditions change rapidly. ORCA provides information based on available data sources and predictive models, but this information should not replace professional maritime safety judgment, official weather warnings, or emergency service guidance. Always verify conditions through official channels before undertaking marine activities.</p>
          <h2>AI Assistant</h2>
          <p>The AI Maritime Assistant provides responses based on available data and AI models. Responses are informational and may contain inaccuracies. Do not rely solely on AI responses for safety-critical decisions.</p>
          <h2>Emergency Services</h2>
          <p>The emergency SOS feature is designed to facilitate contact with relevant authorities. ORCA does not guarantee response times or availability of emergency services. In emergencies, always contact official emergency services directly.</p>
          <h2>Data Accuracy</h2>
          <p>While we strive to provide accurate and up-to-date information, data from external sources (weather services, maritime databases, government agencies) may be delayed, incomplete, or inaccurate. Data accuracy depends on the reliability of source providers.</p>
          <h2>Modifications</h2>
          <p>These terms may be updated periodically. Continued use of the platform constitutes acceptance of any modifications.</p>
        </div>
      </main>
    </div>
  );
}
