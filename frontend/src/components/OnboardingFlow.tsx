import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Globe2,
  ShieldCheck,
  ShieldAlert,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Navigation,
  MapPin,
  Lock,
  Smartphone,
  Compass,
  AlertTriangle,
  Search,
  Waves,
  Eye,
  Check,
  Radio,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { SUPPORTED_LANGUAGES, getStrings, getLanguageDisplay } from '../i18n';
import { INDIAN_PORTS, type Port } from '../data/maritimeData';
import EmergencySOSModal from './EmergencySOSModal';

export default function OnboardingFlow() {
  const {
    currentLang,
    setCurrentLang,
    handleSelectLang,
    userLocation,
    handleUpdateUserLocation,
    handleSelectPort,
    selectedPort,
    coastInfo,
    setHasCompletedOnboarding,
    authenticateWithOtp,
    weather,
    riskLevel,
  } = useAppContext();

  const navigate = useNavigate();
  const t = getStrings(currentLang);

  // Flow step index:
  // 1 = Welcome
  // 2 = Language Selection
  // 3 = Terms & Privacy
  // 4 = Mobile Login
  // 5 = OTP Verification
  // 6 = Location Permission & Selection
  // 7 = Confirm Location & Telemetry Snapshot
  const [step, setStep] = useState<number>(1);

  // Form states
  const [mobileNumber, setMobileNumber] = useState<string>('9876543210');
  const [userName, setUserName] = useState<string>('Ramesh Tandel');
  const [selectedRole, setSelectedRole] = useState<'FISHERMAN' | 'GOVERNMENT' | 'SUPER_ADMIN'>('FISHERMAN');
  const [otpCode, setOtpCode] = useState<string[]>(['1', '2', '3', '4', '5', '6']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isGpsLocating, setIsGpsLocating] = useState<boolean>(false);
  const [portSearch, setPortSearch] = useState<string>('');
  const [showManualPorts, setShowManualPorts] = useState<boolean>(false);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  const filteredPorts = INDIAN_PORTS.filter(
    (p) =>
      p.name.toLowerCase().includes(portSearch.toLowerCase()) ||
      p.state.toLowerCase().includes(portSearch.toLowerCase())
  );

  const handleNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 7));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // OTP input handler
  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const updated = [...otpCode];
    updated[index] = val;
    setOtpCode(updated);

    // Auto move to next box if digit entered
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    const fullOtp = otpCode.join('');
    if (fullOtp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP sent to your mobile.');
      return;
    }

    const success = await authenticateWithOtp(mobileNumber, fullOtp, selectedRole, userName);
    if (success) {
      setStep(6); // Move to location step
    } else {
      setOtpError('Invalid OTP. Use demo OTP: 123456');
    }
  };

  // GPS Request
  const handleRequestGPS = () => {
    if (!('geolocation' in navigator)) {
      setShowManualPorts(true);
      return;
    }

    setIsGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLocating(false);
        handleUpdateUserLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setStep(7); // Proceed to confirmation
      },
      () => {
        setIsGpsLocating(false);
        setShowManualPorts(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleChoosePortManual = (port: Port) => {
    handleSelectPort(port);
    setStep(7); // Proceed to confirmation
  };

  const handleFinishOnboarding = () => {
    setHasCompletedOnboarding(true);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans select-none text-slate-900">
      {/* ── Top Onboarding Header ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A2540] text-white shadow-xs">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-black text-[#0A2540]">ORCA</span>
                <span className="rounded-sm bg-[#0D9488]/10 px-1.5 py-0.2 text-[10px] font-bold text-[#0D9488]">
                  MARINE AI
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick SOS button */}
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5 animate-bounce" />
              <span>{t.sos}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Flow Progress Indicator ── */}
      <div className="w-full bg-slate-200 h-1">
        <div
          className="bg-[#0D9488] h-1 transition-all duration-300"
          style={{ width: `${(step / 7) * 100}%` }}
        />
      </div>

      {/* ── Main Onboarding Container ── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-5 sm:p-8 animate-fadeIn">
          {/* ═════════════════════════════════════════════════════
              STEP 1: WELCOME SCREEN
              ═════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="text-center space-y-6 animate-scaleIn">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0A2540] text-white shadow-lg">
                <Anchor className="h-8 w-8" />
              </div>

              <div>
                <span className="inline-block rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-[#0D9488] mb-2 font-mono">
                  SIH 2026 • PS 26176
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0A2540]">
                  ORCA Marine AI
                </h1>
                <p className="text-sm sm:text-base font-semibold text-slate-700 mt-2">
                  "Your intelligent marine safety & fishing companion"
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  National Coastal Decision-Support Platform with real-time wave forecasts, fishing zones, boundary alerts, and multilingual AI assistance.
                </p>
              </div>

              {/* Language Picker Quick Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Globe2 className="h-4 w-4 text-[#0D9488]" />
                  <span>Language / ભાષા / भाषा:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="font-bold text-[#0D9488] hover:underline cursor-pointer"
                >
                  {getLanguageDisplay(currentLang)} (Change)
                </button>
              </div>

              {/* Primary Action */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl bg-[#0A2540] py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{t.getStarted}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/terms')}
                    className="hover:underline hover:text-slate-800"
                  >
                    Terms of Service
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => navigate('/privacy')}
                    className="hover:underline hover:text-slate-800"
                  >
                    Privacy Policy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════
              STEP 2: LANGUAGE SELECTION
              ═════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5 animate-scaleIn">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] mb-2">
                  <Globe2 className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {t.selectLanguage}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your preferred language for voice alerts, fishing zones, and AI guidance
                </p>
              </div>

              {/* 10 Indian Regional Languages Grid */}
              <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = currentLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLang(lang.code)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0D9488] bg-teal-50/70 text-[#0A2540] font-bold shadow-2xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold">{lang.native}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{lang.name}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-[#0D9488]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 rounded-xl bg-[#0A2540] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{t.continue}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════
              STEP 3: TERMS & PRIVACY DATA EXPLANATION
              ═════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5 animate-scaleIn">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] mb-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Terms & Data Privacy
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  How ORCA Marine AI uses your information for coastal safety
                </p>
              </div>

              {/* Data Explanation Cards */}
              <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed max-h-64 overflow-y-auto pr-1">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Smartphone className="h-4 w-4 text-[#0D9488]" />
                    <span>Mobile Number & Identity</span>
                  </p>
                  <p className="text-slate-600">
                    Used strictly for vessel account authentication and Emergency SOS Search & Rescue (SAR) coordination with the Indian Coast Guard.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <MapPin className="h-4 w-4 text-[#0D9488]" />
                    <span>GPS Location Data</span>
                  </p>
                  <p className="text-slate-600">
                    Processed in real-time to compute exact distance to the coastline, nearby Potential Fishing Zones (PFZ), and international maritime boundaries. You can change location manually at any time.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Lock className="h-4 w-4 text-[#0D9488]" />
                    <span>User Privacy Rights</span>
                  </p>
                  <p className="text-slate-600">
                    Your location is never shared with unauthorized third parties. All emergency transmissions adhere to Maritime Safety Committee (MSC) guidelines.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 rounded-xl bg-[#0A2540] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Agree & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════
              STEP 4: MOBILE NUMBER LOGIN
              ═════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-5 animate-scaleIn">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] mb-2">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Mobile Login
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your mobile number to receive a one-time verification passcode (OTP)
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vessel Master / User Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ramesh Patel"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-12 pr-3.5 text-xs font-mono font-bold text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none tracking-wider"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e: any) => setSelectedRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                  >
                    <option value="FISHERMAN">{t.roleFisherman} (Standard User)</option>
                    <option value="GOVERNMENT">{t.roleGovernment} (Fisheries Official)</option>
                    <option value="SUPER_ADMIN">{t.roleAdmin} (Platform Admin)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  disabled={mobileNumber.length < 10}
                  className="flex-1 rounded-xl bg-[#0A2540] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Send OTP</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════
              STEP 5: OTP VERIFICATION
              ═════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-5 animate-scaleIn">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] mb-2">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Verify Mobile OTP
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit passcode sent to <strong className="font-mono">+91 {mobileNumber}</strong>
                </p>
                <div className="mt-1 inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-[#0D9488] font-mono">
                  Demo Code: 123456
                </div>
              </div>

              {otpError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {/* 6 Digit OTP Input Boxes */}
              <div className="flex justify-center gap-2 sm:gap-2.5">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-10 h-12 text-center rounded-xl border border-slate-300 bg-slate-50 text-base font-mono font-bold text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none shadow-2xs"
                  />
                ))}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setOtpCode(['1', '2', '3', '4', '5', '6'])}
                  className="text-xs font-semibold text-[#0D9488] hover:underline cursor-pointer"
                >
                  Resend OTP
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  {t.back}
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="flex-1 rounded-xl bg-[#0A2540] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verify & Proceed</span>
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════
              STEP 6: LOCATION PERMISSION & PORT SELECTION
              ═════════════════════════════════════════════════════ */}
          {step === 6 && (
            <div className="space-y-5 animate-scaleIn">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] mb-2">
                  <Navigation className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {t.locationTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {t.locationPurpose}
                </p>
              </div>

              {!showManualPorts ? (
                <div className="space-y-3">
                  {/* GPS Option */}
                  <button
                    type="button"
                    onClick={handleRequestGPS}
                    disabled={isGpsLocating}
                    className="w-full rounded-xl bg-[#0A2540] py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isGpsLocating ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4 text-[#0D9488]" />
                    )}
                    <span>{isGpsLocating ? t.detectingGps : t.allowGps}</span>
                  </button>

                  {/* Manual Port Option */}
                  <button
                    type="button"
                    onClick={() => setShowManualPorts(true)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Compass className="h-4 w-4 text-[#0D9488]" />
                    <span>{t.chooseManual}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t.searchLocation}
                      value={portSearch}
                      onChange={(e) => setPortSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {filteredPorts.map((port) => (
                      <button
                        key={port.id}
                        type="button"
                        onClick={() => handleChoosePortManual(port)}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-teal-50 hover:border-teal-300 transition text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{port.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {port.state} • {port.lat.toFixed(2)}°N, {port.lon.toFixed(2)}°E
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#0D9488]">Select →</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManualPorts(false)}
                    className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer block text-center w-full"
                  >
                    ← Back to GPS Detection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════
              STEP 7: CONFIRM LOCATION & STATUS SNAPSHOT
              ═════════════════════════════════════════════════════ */}
          {step === 7 && (
            <div className="space-y-5 animate-scaleIn">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Location Verified
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ready to stream marine safety telemetry and potential fishing zones
                </p>
              </div>

              {/* Verified Coast Details Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Selected Station / Port:</span>
                  <span className="font-bold text-slate-900">{selectedPort.name} ({selectedPort.state})</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">GPS Coordinates:</span>
                  <span className="font-mono font-bold text-[#0D9488]">
                    {userLocation.lat.toFixed(4)}°N, {userLocation.lon.toFixed(4)}°E
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Distance to Coastline:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {coastInfo.distanceKm.toFixed(1)} km ({coastInfo.coastalRegion})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Initial Sea Safety Status:</span>
                  <span className="font-bold text-emerald-700 uppercase flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{riskLevel.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              {/* Far from Coast Warning if applicable */}
              {coastInfo.isFarFromCoast && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Location Advisory Note</p>
                    <p className="text-[11px] mt-0.5">
                      Your position is {coastInfo.distanceKm} km from the coast. ORCA will extrapolate coastal wave models and fishing zones for this sector.
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Action to Enter Dashboard */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="w-full rounded-xl bg-[#0A2540] py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#081D33] active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Anchor className="h-4 w-4 text-[#0D9488]" />
                  <span>Enter ORCA Marine AI</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Change Location
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Emergency SOS Modal Accessible Anywhere */}
      <EmergencySOSModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        userLocation={userLocation}
        currentLang={currentLang}
      />
    </div>
  );
}
