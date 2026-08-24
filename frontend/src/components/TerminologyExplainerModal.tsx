import { X, BookOpen, Waves, Shield, Fish, Compass, Navigation } from 'lucide-react';

interface TerminologyExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: string;
}

export default function TerminologyExplainerModal({
  isOpen,
  onClose,
}: TerminologyExplainerModalProps) {
  if (!isOpen) return null;

  const terms = [
    {
      abbr: 'PFZ',
      full: 'Potential Fishing Zone',
      icon: Fish,
      color: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
      desc: 'Satellite-derived ocean thermal gradients and chlorophyll upwelling zones mapped by INCOIS where pelagic fish schools aggregate.',
    },
    {
      abbr: 'Hs',
      full: 'Significant Wave Height',
      icon: Waves,
      color: 'bg-teal-950/80 border-teal-500/40 text-teal-300',
      desc: 'Standard oceanographic measure representing the average height (in meters) of the highest one-third of all surface waves.',
    },
    {
      abbr: 'Tp',
      full: 'Peak Wave Period (Chop Indicator)',
      icon: Compass,
      color: 'bg-sky-950/80 border-sky-500/40 text-sky-300',
      desc: 'Time interval (in seconds) between successive wave crests. Short periods (< 5.5s) combined with waves > 1.2m create steep, jarring chop hazardous for small vessels.',
    },
    {
      abbr: 'SST',
      full: 'Sea Surface Temperature',
      icon: Navigation,
      color: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300',
      desc: 'Water temperature at the ocean surface in °C. Sharp temperature drops often indicate nutrient-rich deep upwelling favorable for fishing.',
    },
    {
      abbr: 'IMBL',
      full: 'International Maritime Boundary Line',
      icon: Shield,
      color: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
      desc: 'Official international maritime boundary dividing Indian sovereign waters from Pakistan, Sri Lanka, and neighboring states. ORCA monitors distance to prevent border incursions.',
    },
    {
      abbr: 'MPA',
      full: 'Marine Protected Area',
      icon: Shield,
      color: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
      desc: 'Ecologically sensitive coral reef reserves and national marine parks (such as Gulf of Mannar and Malvan) where commercial trawling is strictly regulated by law.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Marine Terminology Guide</h2>
              <p className="text-xs text-slate-400">Plain-language explanations for coastal operators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Terminology List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 scrollbar-thin">
          {terms.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.abbr} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${item.color} flex items-center gap-1.5`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.abbr}</span>
                  </span>
                  <span className="font-bold text-xs text-slate-200">{item.full}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
