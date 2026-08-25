import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { DashboardNav } from '../components/DashboardNav';
import MarineMap from '../components/MarineMap';
import { GisLayersPanel } from '../components/GisLayersPanel';
import { Layers } from 'lucide-react';

export default function MapPage() {
  const navigate = useNavigate();
  const { userLocation, selectedPort, pfzZones, gisLayers, handleToggleLayer, handleRelocateVessel, currentLang } =
    useGlobalContext();
  const [showLayers, setShowLayers] = useState(false);

  const locationName = selectedPort
    ? `${selectedPort.name}, ${selectedPort.state}`
    : 'Daman, Dadra and Nagar Haveli and Daman and Diu';

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

      {/* Main Map Container */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0a2540] font-display">Your coastal area</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {locationName} · 32.5 km distance to coastline
            </p>
          </div>

          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              showLayers
                ? 'bg-[#0a2540] text-white border-[#0a2540]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GIS Satellite Overlays</span>
          </button>
        </div>

        <div className="flex gap-4 flex-1 relative min-h-[520px]">
          {showLayers && (
            <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-lg p-3 shadow-sm h-[520px] overflow-y-auto">
              <GisLayersPanel
                layers={gisLayers}
                onToggleLayer={handleToggleLayer}
                currentLang={currentLang}
              />
            </div>
          )}

          <div className="flex-1 h-[520px] bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm relative z-0">
            <MarineMap
              userLocation={userLocation}
              pfzZones={pfzZones}
              layers={gisLayers}
              onRelocateVessel={handleRelocateVessel}
            />
          </div>
        </div>

        {/* Legend Card Matching Screenshot 092210.png */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs">
            <span className="font-bold text-slate-900">Legend</span>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-[#007380] inline-block shadow-xs"></span>
              <span>Your location</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block shadow-xs"></span>
              <span>Potential Fishing Zones (PFZ)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f43f5e] inline-block"></span>
              <span>Maritime Border (IMBL)</span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400">
            Map data &copy; OpenStreetMap · INCOIS Advisory Layers
          </span>
        </div>
      </div>
    </div>
  );
}

