import { Check, ArrowRight } from 'lucide-react';
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
    <div className="modal-backdrop">
      <div className="modal-card p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-2xl">
            🌐
          </div>
          <h2 className="text-lg font-bold text-slate-900">Select Your Language</h2>
          <p className="text-xs text-slate-500 mt-1">ତମାରી ভাষা পসন্দ করো / अपनी भाषा चुनें</p>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {REGIONAL_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLang(lang.code)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm ring-1 ring-teal-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className={`font-bold text-sm ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
                    {lang.native}
                  </div>
                  <div className={`text-[11px] ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}>
                    {lang.name}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.97] cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0B3D5B 0%, #0F766E 100%)' }}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
