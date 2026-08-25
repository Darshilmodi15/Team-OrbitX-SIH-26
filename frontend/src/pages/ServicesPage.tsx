import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { DashboardNav } from '../components/DashboardNav';
import { Phone, Share2 } from 'lucide-react';

interface ServiceItem {
  name: string;
  number: string;
  description: string;
  source: string;
}

const SERVICES: ServiceItem[] = [
  {
    name: 'National Emergency Response (112)',
    number: '112',
    description: 'Single emergency number for police, fire and medical help across India.',
    source: 'Ministry of Home Affairs, ERSS',
  },
  {
    name: 'Indian Coast Guard (1554)',
    number: '1554',
    description: 'Maritime distress, search and rescue at sea.',
    source: 'Indian Coast Guard',
  },
  {
    name: 'Ambulance (108)',
    number: '108',
    description: 'Emergency medical assistance.',
    source: 'National Health Mission',
  },
  {
    name: 'District Disaster Control Room (1077)',
    number: '1077',
    description: 'District-level disaster management control room.',
    source: 'National Disaster Management Authority',
  },
  {
    name: 'NDMA Control Room (1078)',
    number: '1078',
    description: 'National Disaster Management Authority helpline.',
    source: 'National Disaster Management Authority',
  },
  {
    name: 'Coastal Security Helpline (1093)',
    number: '1093',
    description: 'Report suspicious activity or coastal security concerns.',
    source: 'Ministry of Home Affairs',
  },
];

export default function ServicesPage() {
  const navigate = useNavigate();
  const { userLocation, selectedPort } = useGlobalContext();

  const locationName = selectedPort
    ? `${selectedPort.name}, ${selectedPort.state}`
    : 'Daman, Dadra and Nagar Haveli and Daman and Diu';

  const handleShareLocation = () => {
    const text = `Vessel Location: ${userLocation.lat.toFixed(4)}° N, ${userLocation.lon.toFixed(4)}° E (Near ${locationName})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Location copied to clipboard: ' + text);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body flex flex-col">
      <DashboardNav />

      {/* Subheader */}
      <div className="bg-[#f4f7f9] border-b border-slate-200 px-6 py-2.5 flex justify-between items-center text-sm shadow-sm shrink-0">
        <span className="text-slate-700 font-medium">{locationName}</span>
        <button
          onClick={() => navigate('/location')}
          className="text-[#0a2540] font-medium hover:text-teal-700 transition-colors cursor-pointer"
        >
          Change location
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-[#0a2540] font-display">
            Emergency & government services
          </h1>

          {/* Red Alert Banner */}
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-red-700 font-bold text-base mb-1">Emergency help</h2>
              <p className="text-slate-700 text-sm">Call the national emergency number 112 now?</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="tel:112"
                className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold py-3 px-6 rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm shadow-sm"
              >
                <Phone className="w-4 h-4" />
                112
              </a>

              <button
                onClick={handleShareLocation}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium py-3 px-6 rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm shadow-sm"
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                Share my location
              </button>
            </div>
          </div>

          {/* Services List */}
          <div className="flex flex-col gap-3">
            {SERVICES.map((service) => (
              <div
                key={service.name}
                className="bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-slate-900 text-base">{service.name}</h3>
                  <p className="text-slate-600 text-sm">{service.description}</p>
                  <span className="text-slate-400 text-xs mt-1">Source: {service.source}</span>
                </div>

                <a
                  href={`tel:${service.number}`}
                  className="bg-[#0a2540] hover:bg-[#1a365d] text-white font-medium text-sm px-5 py-2.5 rounded-md flex items-center gap-2 shrink-0 transition-colors cursor-pointer shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
