import { Check, Globe2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getStrings } from '../i18n';

interface LanguageSelectorModalProps {
  currentLang: string;
  onSelectLang: (langCode: string) => void;
  onContinue: () => void;
  isOpen: boolean;
  onClose?: () => void;
}

export default function LanguageSelectorModal({
  currentLang,
  onSelectLang,
  onContinue,
  isOpen,
  onClose,
}: LanguageSelectorModalProps) {
  const t = getStrings(currentLang);
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop px-3" role="dialog" aria-modal="true" aria-labelledby="language-title">
      <div className="modal-card max-w-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Globe2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="language-title" className="text-lg font-bold text-slate-950">
                {t.selectLanguage}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{t.descriptor}</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t.close}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => onSelectLang(lang.code)}
                className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-teal-500 bg-teal-50 text-teal-950 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-teal-50/60'
                }`}
              >
                <span>
                  <span className="block text-base font-bold">{lang.native}</span>
                  <span className="block text-xs font-medium text-slate-500">{lang.name}</span>
                </span>
                {selected && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0B3D5B] px-5 text-sm font-bold text-white transition hover:bg-[#082C42]"
        >
          {t.continue}
        </button>
      </div>
    </div>
  );
}
