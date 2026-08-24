import React from 'react';

interface FooterProps {
  currentLang?: string;
}

export const Footer: React.FC<FooterProps> = () => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <footer className="w-full px-5 py-2 bg-white/90 backdrop-blur-sm border-t border-slate-100 text-[10px] text-slate-400 font-medium flex items-center justify-between select-none">
      <span>ORCA Marine AI · National Coastal Safety & Decision Intelligence</span>
      <span className="font-mono">INCOIS · Last Sync: {timeStr}</span>
    </footer>
  );
};
