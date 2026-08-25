import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  Radio,
  X,
  Copy,
  Check,
  ShieldAlert,
  Users,
  Compass,
} from 'lucide-react';
import { broadcastSOS, fetchEmergencyContacts } from '../services/api';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lon: number };
  currentLang?: string;
}

export default function EmergencySOSModal({
  isOpen,
  onClose,
  userLocation,
}: EmergencySOSModalProps) {
  const [tab, setTab] = useState<'SOS' | 'DIRECTORY'>('SOS');
  const [emergencyNature, setEmergencyNature] = useState('Engine Failure / Adrift at Sea');
  const [vesselName, setVesselName] = useState('Matsya Sagar IND');
  const [crewCount, setCrewCount] = useState(4);
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('+91-9876543210');

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sosResult, setSosResult] = useState<any | null>(null);
  const [copiedMayday, setCopiedMayday] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchEmergencyContacts().then((data) => {
        if (Array.isArray(data)) setContacts(data);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerSOS = async () => {
    setIsBroadcasting(true);
    try {
      const res = await broadcastSOS({
        vessel_name: vesselName,
        lat: userLocation.lat,
        lon: userLocation.lon,
        crew_count: crewCount,
        emergency_nature: emergencyNature,
        notes,
        contact_phone: contactPhone,
      });
      setSosResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch SOS broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopyMayday = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMayday(true);
    setTimeout(() => setCopiedMayday(false), 2500);
  };

  const filteredContacts = contacts.filter((c) => {
    if (!stateFilter) return true;
    return c.region.toLowerCase().includes(stateFilter.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(225,29,72,0.3)] text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>MARITIME EMERGENCY & SOS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 font-mono">
                  24x7 SAR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Indian Coast Guard (1554) • Coastal Police (1093)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-slate-950/70 p-1 border border-slate-800 my-3 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setTab('SOS')}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'SOS' ? 'bg-rose-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            🚨 Instant SOS Beacon
          </button>
          <button
            type="button"
            onClick={() => setTab('DIRECTORY')}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
              tab === 'DIRECTORY' ? 'bg-teal-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            📞 Emergency Directory
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          {tab === 'SOS' ? (
            <>
              {/* Quick Call Action Bar */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="tel:1554"
                  className="p-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-center transition flex flex-col items-center justify-center group"
                >
                  <Phone className="w-4 h-4 text-rose-400 mb-1 group-hover:scale-110 transition" />
                  <span className="font-black text-sm text-rose-200">1554</span>
                  <span className="text-[9px] text-rose-400 font-mono">Coast Guard SAR</span>
                </a>
                <a
                  href="tel:1093"
                  className="p-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-center transition flex flex-col items-center justify-center group"
                >
                  <Phone className="w-4 h-4 text-sky-400 mb-1 group-hover:scale-110 transition" />
                  <span className="font-black text-sm text-sky-200">1093</span>
                  <span className="text-[9px] text-sky-400 font-mono">Coastal Police</span>
                </a>
                <a
                  href="tel:112"
                  className="p-2.5 rounded-xl bg-teal-950/80 hover:bg-teal-900 border border-teal-500/50 text-center transition flex flex-col items-center justify-center group"
                >
                  <Phone className="w-4 h-4 text-teal-400 mb-1 group-hover:scale-110 transition" />
                  <span className="font-black text-sm text-teal-200">112</span>
                  <span className="text-[9px] text-teal-400 font-mono">National 112</span>
                </a>
              </div>

              {/* Broadcast Result or Form */}
              {sosResult ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/50 text-xs space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>SOS BEACON ACTIVE: {sosResult.sos_id}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(sosResult.broadcast_timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
                    <strong>Routing:</strong> {sosResult.assigned_mrcc}
                  </div>

                  {/* MAYDAY Radio Transcript */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300 mb-1">
                      <span>📻 VHF CH 16 MAYDAY FORMAT:</span>
                      <button
                        onClick={() => handleCopyMayday(sosResult.mayday_message)}
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 cursor-pointer"
                      >
                        {copiedMayday ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMayday ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-black/60 border border-slate-800 text-[11px] text-amber-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {sosResult.mayday_message}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
                  {/* Current Position Tag */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-teal-400" />
                      <span>GPS BEACON:</span>
                    </span>
                    <span className="text-teal-300 font-bold">
                      {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
                    </span>
                  </div>

                  {/* Emergency Nature */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Emergency Crisis Nature
                    </label>
                    <select
                      value={emergencyNature}
                      onChange={(e) => setEmergencyNature(e.target.value)}
                      className="w-full h-9 bg-slate-900 text-slate-100 rounded-xl px-3 border border-slate-700 text-xs focus:outline-none focus:border-rose-500"
                    >
                      <option value="Engine Failure / Adrift at Sea">Engine Failure / Adrift at Sea</option>
                      <option value="Vessel Capsizing / Taking Water">Vessel Capsizing / Taking Water</option>
                      <option value="Critical Medical Emergency on Board">Critical Medical Emergency on Board</option>
                      <option value="Severe Squall / Cyclone Trapped">Severe Squall / Cyclone Trapped</option>
                      <option value="Collision / Grounding on Reef">Collision / Grounding on Reef</option>
                      <option value="International Border / Security Distress">International Border / Security Distress</option>
                      <option value="General Maritime Distress">General Maritime Distress</option>
                    </select>
                  </div>

                  {/* Vessel Name & Crew Count */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Vessel / Boat Name
                      </label>
                      <input
                        type="text"
                        value={vesselName}
                        onChange={(e) => setVesselName(e.target.value)}
                        className="w-full h-8 bg-slate-900 text-slate-100 rounded-xl px-2.5 border border-slate-700 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Crew Count (POB)
                      </label>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={crewCount}
                          onChange={(e) => setCrewCount(parseInt(e.target.value) || 1)}
                          className="w-full h-8 bg-slate-900 text-slate-100 rounded-xl px-2.5 border border-slate-700 text-xs focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Phone & Notes */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Contact / Skipper Phone
                    </label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full h-8 bg-slate-900 text-slate-100 rounded-xl px-2.5 border border-slate-700 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Situation Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Taking water from stern, 4 life jackets active..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-8 bg-slate-900 text-slate-100 rounded-xl px-2.5 border border-slate-700 text-xs focus:outline-none"
                    />
                  </div>

                  {/* Master SOS Trigger Button */}
                  <button
                    type="button"
                    onClick={handleTriggerSOS}
                    disabled={isBroadcasting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm shadow-[0_0_30px_rgba(225,29,72,0.6)] transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                    <span>{isBroadcasting ? 'DISPATCHING BEACON...' : 'DISPATCH SOS DISTRESS BEACON'}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Directory Tab */
            <div className="space-y-3">
              {/* Filter */}
              <input
                type="text"
                placeholder="Filter by coastal state (e.g. Gujarat, Maharashtra, Kerala)..."
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full h-9 bg-slate-950 text-slate-200 rounded-xl px-3 border border-slate-800 text-xs focus:outline-none"
              />

              <div className="space-y-2.5">
                {filteredContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{contact.agency_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-950 border border-teal-500/30 text-teal-300 font-mono">
                        {contact.region}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">{contact.description}</p>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-900 font-mono text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-cyan-400" />
                        <span>{contact.radio_channel}</span>
                      </span>
                      <a
                        href={`tel:${contact.helpline}`}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call {contact.helpline}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Close Emergency Panel
          </button>
        </div>
      </div>
    </div>
  );
}
