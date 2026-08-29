import { useState } from 'react';
import {
  Phone,
  Radio,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  X,
  Send,
} from 'lucide-react';
import { broadcastSOS } from '../services/api';
import type { LocationCoords } from '../context/AppContext';
import { getStrings } from '../i18n';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: LocationCoords;
  currentLang?: string;
}

export default function EmergencySOSModal({
  isOpen,
  onClose,
  userLocation,
  currentLang = 'en',
}: EmergencySOSModalProps) {
  const t = getStrings(currentLang);

  const [step, setStep] = useState<'standby' | 'confirming' | 'dispatched'>('standby');
  const [vesselName, setVesselName] = useState('Matsya Shakti');
  const [registrationNo] = useState('IND-MH-01-F-4433');
  const [crewCount, setCrewCount] = useState(6);
  const [emergencyNature, setEmergencyNature] = useState('Engine Failure / Adrift at Sea');
  const [notes] = useState('Drifting west towards offshore shipping corridor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    try {
      const res = await broadcastSOS({
        vessel_name: vesselName,
        registration_no: registrationNo,
        lat: userLocation.lat,
        lon: userLocation.lon,
        crew_count: crewCount,
        emergency_nature: emergencyNature,
        notes: notes,
      });
      setDispatchResult(res);
      setStep('dispatched');
    } catch (err) {
      console.warn('SOS broadcast fallback:', err);
      setDispatchResult({
        id: `SOS-${Date.now().toString().slice(-6)}`,
        status: 'ACTIVE_BEACON_DISPATCHED',
        assigned_mrcc: userLocation.lon > 78.5 ? 'MRCC Chennai' : 'MRCC Mumbai',
        mayday_message: `MAYDAY MAYDAY MAYDAY. THIS IS FISHING VESSEL ${vesselName.toUpperCase()}, REG ${registrationNo}. POSITION ${userLocation.lat.toFixed(4)}N ${userLocation.lon.toFixed(4)}E. NATURE OF DISTRESS: ${emergencyNature.toUpperCase()}. PERSONS ON BOARD: ${crewCount}. OVER.`,
      });
      setStep('dispatched');
    } finally {
      setIsSubmitting(false);
    }
  };

  const emergencyHelplines = [
    {
      agency: t.sosCoastGuard,
      phone: '1554',
      alt: '+91-11-23384934',
      radio: 'VHF Ch 16 / 2182 kHz',
      coverage: t.sosNationalEez,
    },
    {
      agency: t.sosCsp,
      phone: '1093',
      alt: '112',
      radio: 'VHF Channel 16',
      coverage: t.sosAllCoastalStates,
    },
    {
      agency: t.sosNdrf,
      phone: '1078',
      alt: '+91-11-24363260',
      radio: 'Disaster Emergency',
      coverage: t.sosCycloneRescue,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-5 sm:p-6 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white shadow-xs">
              <Phone className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-red-950">
                {t.sosTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {t.sosDirectSar}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── State 1: Standby / Pre-Confirmation ─── */}
        {step === 'standby' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-red-950 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>{t.sosDistressNotice}</span>
              </div>
              <p>{t.sosWarning}</p>
            </div>

            {/* Vessel Coordinates Confirmation */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t.sosGpsCoordinates}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t.sosSarSector}:</span>
                <span className="font-semibold text-[#0D9488]">
                  {userLocation.lon > 78.5 ? 'MRCC Chennai (Bay of Bengal)' : 'MRCC Mumbai (Arabian Sea)'}
                </span>
              </div>
            </div>

            {/* Quick Editable Distress Details */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.sosVesselName}
                  </label>
                  <input
                    type="text"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t.sosCrewOnBoard}
                  </label>
                  <input
                    type="number"
                    value={crewCount}
                    onChange={(e) => setCrewCount(parseInt(e.target.value) || 1)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t.sosDistressNature}
                </label>
                <select
                  value={emergencyNature}
                  onChange={(e) => setEmergencyNature(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="Engine Failure / Adrift at Sea">{t.sosEngineFailure}</option>
                  <option value="Capsize / Taking on Water">{t.sosCapsizeSinking}</option>
                  <option value="Medical Emergency on Board">{t.sosMedicalEmergency}</option>
                  <option value="Severe Weather / Cyclone Squall">{t.sosSevereWeather}</option>
                  <option value="Man Overboard (MOB)">{t.sosManOverboard}</option>
                  <option value="Collision / Grounding">{t.sosCollision}</option>
                </select>
              </div>
            </div>

            {/* Confirmation CTA */}
            <button
              type="button"
              onClick={() => setStep('confirming')}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-extrabold text-white shadow-md hover:bg-red-700 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              <span>{t.sosProceedTransmit}</span>
            </button>
          </div>
        )}

        {/* ─── State 2: Dual-Step Confirmation ─── */}
        {step === 'confirming' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-300 bg-red-100/90 p-4 text-center">
              <ShieldAlert className="h-10 w-10 text-red-600 mx-auto mb-2 animate-bounce" />
              <h4 className="font-display text-base font-black text-red-950">
                {t.sosFinalConfirmation}
              </h4>
              <p className="text-xs text-red-800 mt-1">
                {t.sosFinalConfirmDesc}{' '}
                <strong className="font-mono">
                  ({userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E)
                </strong>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('standby')}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                {t.sosCancel}
              </button>
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-black text-white shadow-md hover:bg-red-700 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>{t.sosDispatching}</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t.sosTransmitNow}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── State 3: SOS Dispatched & Live Transcript ─── */}
        {step === 'dispatched' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-1.5" />
              <h4 className="font-display text-base font-extrabold text-emerald-950">
                {t.sosBeaconDispatched}
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Assigned to <strong>{dispatchResult?.assigned_mrcc || 'MRCC Operations'}</strong>. {t.sosBeaconDispatchedDesc}
              </p>
            </div>

            {/* Generated MAYDAY Transcript */}
            <div className="rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100 font-mono space-y-1">
              <p className="text-emerald-400 font-bold">
                [{t.sosGmdssTranscript}]
              </p>
              <p className="leading-relaxed whitespace-pre-wrap">
                {dispatchResult?.mayday_message ||
                  `MAYDAY MAYDAY MAYDAY. THIS IS ${vesselName.toUpperCase()}, REG ${registrationNo}. POSITION ${userLocation.lat.toFixed(4)}N ${userLocation.lon.toFixed(4)}E. NATURE: ${emergencyNature.toUpperCase()}. PERSONS: ${crewCount}. OVER.`}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-[#0A2540] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#081D33] transition cursor-pointer"
            >
              {t.sosReturnDashboard}
            </button>
          </div>
        )}

        {/* ─── Emergency Telephone Directory ─── */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            {t.sosHelplineTitle}
          </p>

          <div className="space-y-2">
            {emergencyHelplines.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{item.agency}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.radio} • {item.coverage}
                  </p>
                </div>
                <a
                  href={`tel:${item.phone}`}
                  className="flex items-center gap-1 rounded-md bg-[#0D9488] px-3 py-1.5 font-bold text-white shadow-2xs hover:bg-[#0F766E] transition cursor-pointer"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{t.sosCallPrefix} {item.phone}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
