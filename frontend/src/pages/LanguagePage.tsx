import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
];

export default function LanguagePage() {
  const navigate = useNavigate();
  const { currentLang, handleSelectLang } = useGlobalContext();
  const [selected, setSelected] = useState(currentLang);

  const handleContinue = () => {
    handleSelectLang(selected);
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center pt-24 pb-12 px-6">
      <div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center mb-8 shadow-sm">
        <span className="text-white font-bold text-xl">⚓</span>
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">Choose your language</h1>
      <p className="text-slate-500 mb-10">The entire application will use the language you select.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-12">
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`p-4 rounded-lg border text-left relative flex flex-col justify-center transition-all cursor-pointer ${
                isSelected 
                  ? 'border-teal-600 bg-teal-50/30 shadow-sm' 
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm hover:shadow'
              }`}
            >
              <span className={`text-lg font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                {lang.native}
              </span>
              <span className={`text-sm ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>
                {lang.english}
              </span>
              {isSelected && (
                <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600 w-5 h-5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-6 w-full max-w-4xl">
        <button 
          onClick={handleContinue}
          className="flex-1 bg-[#1e3a5f] hover:bg-[#152e4d] text-white font-medium py-3 px-8 rounded-lg transition-colors cursor-pointer"
        >
          Continue
        </button>
        <button 
          onClick={() => navigate(-1)}
          className="text-slate-600 hover:text-slate-900 font-medium px-4 cursor-pointer"
        >
          Back
        </button>
      </div>
    </div>
  );
}
