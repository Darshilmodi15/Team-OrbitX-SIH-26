import { getQuickPrompts } from '../data/quickPrompts';

interface QuickPromptsGridProps {
  currentLang?: string;
  onSelectPrompt: (query: string) => void;
  isLoading?: boolean;
}

export default function QuickPromptsGrid({
  currentLang = 'en',
  onSelectPrompt,
  isLoading = false,
}: QuickPromptsGridProps) {
  const prompts = getQuickPrompts(currentLang);

  const headerTitles: Record<string, { title: string; subtitle: string }> = {
    en: {
      title: 'Suggested Maritime Inquiries',
      subtitle: 'Click any quick action below for instant AI tactical intelligence',
    },
    hi: {
      title: 'सुझाए गए त्वरित प्रश्न',
      subtitle: 'तुरंत समुद्री एआई जानकारी के लिए नीचे किसी भी विकल्प पर क्लिक करें',
    },
    gu: {
      title: 'સૂચવેલા ઝડપી પ્રશ્નો',
      subtitle: 'ત્વરિત દરિયાઈ એઆઈ માહિતી મેળવવા નીચેના વિકલ્પ પર ક્લિક કરો',
    },
    mr: {
      title: 'सुचवलेले महत्त्वाचे प्रश्न',
      subtitle: 'त्वरित सागरी एआय माहितीसाठी खालील पर्यायावर क्लिक करा',
    },
    ta: {
      title: 'பரிந்துரைக்கப்பட்ட விரைவு கேள்விகள்',
      subtitle: 'உடனடி AI கடல் தகவலுக்கு கீழே உள்ள ஏதேனும் ஒரு விருப்பத்தை கிளிக் செய்யவும்',
    },
    ml: {
      title: 'ദ്രുത ചോദ്യങ്ങൾ',
      subtitle: 'തൽക്ഷണ സമുദ്ര AI വിവരങ്ങൾക്ക് താഴെ ക്ലിക്ക് ചെയ്യുക',
    },
  };

  const header = headerTitles[currentLang] || headerTitles.en;

  return (
    <div className="my-3 p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#030a1c]/95 border border-cyan-500/25 shadow-2xl backdrop-blur-xl animate-fadeIn">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
            {header.title}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400/90 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30">
          ⚡ 1-CLICK ASK
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mb-3 font-sans">
        {header.subtitle}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {prompts.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectPrompt(p.query)}
            className="group text-left p-3 rounded-xl bg-slate-950/60 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-400/60 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 group-hover:border-cyan-400/40 group-hover:scale-110 transition-transform">
                  {p.icon}
                </span>
                <span className="font-bold text-xs text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {p.label}
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-400 group-hover:text-cyan-300 group-hover:border-cyan-500/30 border border-slate-800 transition-colors">
                {p.badge}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 group-hover:text-slate-300 line-clamp-2 leading-tight transition-colors pl-0.5">
              {p.desc}
            </p>

            <div className="mt-2 pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-cyan-400/80 font-mono opacity-80 group-hover:opacity-100 transition-opacity">
              <span>Ask ORCA</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
