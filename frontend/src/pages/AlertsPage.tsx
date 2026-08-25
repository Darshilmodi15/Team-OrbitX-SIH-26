import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { DashboardNav } from '../components/DashboardNav';
import { AlertTriangle, ShieldCheck, Waves, Wind, Bell, ExternalLink } from 'lucide-react';

export default function AlertsPage() {
  const navigate = useNavigate();
  const { selectedPort, weather } = useGlobalContext();

  const locationName = selectedPort
    ? `${selectedPort.name}, ${selectedPort.state}`
    : 'Daman, Dadra and Nagar Haveli and Daman and Diu';

  const isSafe = weather.wave_height_m < 2.5 && weather.wind_speed_kmh < 45;

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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#0a2540] font-display">
              Coastal Alerts & Advisories
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              Source: INCOIS & IMD Marine Bulletins
            </span>
          </div>

          {/* Current Overall Safety Status */}
          <div
            className={`border rounded-lg p-6 flex items-start gap-4 shadow-sm ${
              isSafe
                ? 'bg-[#ecfdf5] border-[#a7f3d0]'
                : 'bg-[#fffbeb] border-[#fde68a]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isSafe ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h2
                className={`font-bold text-lg ${
                  isSafe ? 'text-emerald-900' : 'text-amber-900'
                }`}
              >
                {isSafe ? 'Normal Maritime Operational Conditions' : 'Moderate Weather Alert'}
              </h2>
              <p
                className={`text-sm mt-1 ${
                  isSafe ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {isSafe
                  ? 'No severe weather, cyclone, or high swell warnings active for this sector. Standard safety equipment and VHF marine radio monitoring advised.'
                  : 'Swell waves or elevated wind speeds detected. Exercise caution and adhere to port authority guidelines.'}
              </p>
            </div>
          </div>

          {/* Active Bulletins Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                  <Waves className="w-5 h-5 text-teal-600" />
                  <span>Swell Surge Advisory</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Low Risk
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Swell heights expected between 1.0 m to 1.5 m with period of 8-10 seconds along the south Gujarat coast.
              </p>
              <div className="text-xs text-slate-400 mt-2">Valid through next 24 hours</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                  <Wind className="w-5 h-5 text-sky-600" />
                  <span>Squally Wind Alert</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Safe
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Winds gusting up to 15-20 km/h from westerly direction. Favorable for small fishing craft operations.
              </p>
              <div className="text-xs text-slate-400 mt-2">Updated 10 minutes ago</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <span>Maritime Border (IMBL) Proximity</span>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  Monitored
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Maintain awareness of International Maritime Boundary Lines. Real-time audible buzzer enabled in Tactical Radar.
              </p>
              <div className="text-xs text-slate-400 mt-2">Active Geofence Protection</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Marine Protected Areas</span>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  Sanctuary Notice
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Marine sanctuaries and coral conservation zones are marked. Commercial bottom-trawling strictly prohibited.
              </p>
              <div className="text-xs text-slate-400 mt-2">Wildlife Protection Act 1972</div>
            </div>
          </div>

          {/* Official Port Authority Contact Note */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Need immediate assistance?</h3>
              <p className="text-slate-600 text-xs mt-0.5">
                Check government emergency contacts or connect with Coast Guard rescue dispatchers.
              </p>
            </div>
            <button
              onClick={() => navigate('/services')}
              className="bg-[#0a2540] hover:bg-[#1a365d] text-white text-xs font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Emergency Services</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
