import { Check, Globe, ArrowRight } from 'lucide-react';
import { REGIONAL_LANGUAGES } from '../data/maritimeData';

interface LanguageSelectorModalProps {
  currentLang: string;
  onSelectLang: (langCode: string) => void;
  onContinue: () => void;
  isOpen: boolean;
}

export default function LanguageSelectorModal({
  currentLang,
  onSelectLang,
  onContinue,
  isOpen,
}: LanguageSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Select Your Language</h2>
            <p className="text-xs text-slate-400">તમારી ભાષા પસંદ કરો / अपनी भाषा चुनें</p>
          </div>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {REGIONAL_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLang(lang.code)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-teal-950/60 border-teal-400 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)] ring-1 ring-teal-400'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">{lang.native}</div>
                  <div className="text-[11px] text-slate-400">{lang.name}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
