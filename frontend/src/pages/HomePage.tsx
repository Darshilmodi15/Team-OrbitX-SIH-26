
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Waves, MessageSquare, Bell } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F9FC] font-body">
      {/* Hero Section */}
      <section className="bg-[#1e3a5f] text-white px-8 py-20 flex flex-col items-start justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <p className="text-sm font-semibold tracking-wider text-teal-400 mb-4 uppercase">
            National Coastal Safety & Decision Intelligence Platform
          </p>
          <h1 className="text-5xl font-bold mb-6 font-display">ORCA Marine AI</h1>
          <p className="text-lg text-slate-300 max-w-2xl mb-10 leading-relaxed">
            Real-time coastal intelligence, marine safety alerts, weather awareness and AI-assisted decision support for India's coastal communities.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-8 rounded transition-colors cursor-pointer"
            >
              Get Started
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-transparent hover:bg-white/10 border border-white/30 text-white font-medium py-3 px-8 rounded transition-colors cursor-pointer"
            >
              Explore Platform
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <ShieldCheck className="text-teal-600 w-6 h-6 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Marine Safety</h3>
            <p className="text-slate-500 text-sm">Know whether it is safe to go out, before you leave shore.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <Waves className="text-teal-600 w-6 h-6 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Weather & Ocean Conditions</h3>
            <p className="text-slate-500 text-sm">Waves, wind, visibility and sea temperature for your location.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <Bell className="text-teal-600 w-6 h-6 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Coastal Alerts</h3>
            <p className="text-slate-500 text-sm">Official advisories and warnings for your coastal district.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <MessageSquare className="text-teal-600 w-6 h-6 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Multilingual AI Assistant</h3>
            <p className="text-slate-500 text-sm">Ask questions in your own language and get plain answers.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-8 py-6 flex justify-between items-center text-sm text-slate-500 mt-auto">
        <div>ORCA Marine AI · For India's coastal communities.</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-800">Privacy Policy</a>
          <a href="#" className="hover:text-slate-800">Terms & Conditions</a>
        </div>
      </footer>
    </div>
  );
}
