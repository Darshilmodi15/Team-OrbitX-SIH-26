import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Minimize2,
  Maximize2,
  Fish,
  Shield,
  CloudSun,
  Anchor,
  AlertTriangle,
  Navigation,
  RotateCcw,
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import QueryInput from './QueryInput';
import type { MessageItem } from '../App';
import { TRANSLATIONS } from '../data/maritimeData';

interface ChatPanelProps {
  messages: MessageItem[];
  isLoading: boolean;
  error: string | null;
  currentLang?: string;
  onSendMessage: (question: string) => void;
  onClearError?: () => void;
  onResetChat?: () => void;
}

export default function ChatPanel({
  messages,
  isLoading,
  error,
  currentLang = 'en',
  onSendMessage,
  onClearError,
  onResetChat,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Quick Action Buttons (2 buttons per row grid)
  const quickActions = [
    {
      id: 'pfz',
      label: t.quickPfz || 'Nearest PFZ',
      icon: Fish,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900',
      query:
        currentLang === 'gu'
          ? 'નજીકનો સંભવિત માછીમારી વિસ્તાર (PFZ) ક્યાં આવેલો છે?'
          : currentLang === 'hi'
            ? 'निकटतम संभावित मत्स्य क्षेत्र (PFZ) कहाँ स्थित है?'
            : currentLang === 'mr'
              ? 'जवळचे संभाव्य मासेमारी क्षेत्र (PFZ) कुठे आहे?'
              : currentLang === 'ta'
                ? 'அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலம் எங்குள்ளது?'
                : currentLang === 'ml'
                  ? 'ഏറ്റവും അടുത്തുള്ള മത്സ്യബന്ധന മേഖല എവിടെയാണ്?'
                  : 'Where is the nearest Potential Fishing Zone (PFZ)?',
    },
    {
      id: 'safe',
      label: t.quickSafe || 'Is it safe?',
      icon: Shield,
      iconColor: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100/80 border-teal-200 text-teal-900',
      query:
        currentLang === 'gu'
          ? 'શું આજે દરિયામાં માછીમારી કરવા જવું સુરક્ષિત છે?'
          : currentLang === 'hi'
            ? 'क्या आज समुद्र में नौकायन सुरक्षित है?'
            : currentLang === 'mr'
              ? 'आज समुद्रात जाणे सुरक्षित आहे का?'
              : currentLang === 'ta'
                ? 'இன்று கடலுக்குள் செல்ல பாதுகாப்பானதா?'
                : currentLang === 'ml'
                  ? 'ഇന്ന് കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ?'
                  : 'Is it safe to venture into the sea today?',
    },
    {
      id: 'tide',
      label: t.quickTide || 'Tide & Weather',
      icon: CloudSun,
      iconColor: 'text-sky-600',
      bgColor: 'bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-900',
      query:
        currentLang === 'gu'
          ? 'આજના દરિયાઈ ભરતી-ઓટ અને હવામાનની સ્થિતિ જણાવો.'
          : currentLang === 'hi'
            ? 'आज के समुद्री ज्वार-भाटा और मौसम का पूर्वानुमान बताएं।'
            : currentLang === 'mr'
              ? 'आज समुद्रातील भरती आणि हवामानाचा अंदाज सांगा.'
              : currentLang === 'ta'
                ? 'இன்றைய அலை மற்றும் வானிலை நிலவரம் என்ன?'
                : currentLang === 'ml'
                  ? 'ഇന്നത്തെ വേലിയേറ്റവും കാലാവസ്ഥയും വ്യക്തമാക്കുക.'
                  : 'What is the current tide state and marine weather forecast?',
    },
    {
      id: 'conditions',
      label: t.quickConditions || 'Sea Conditions',
      icon: Anchor,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200 text-indigo-900',
      query:
        currentLang === 'gu'
          ? 'દરિયાઈ મોજાંઓની ઊંચાઈ અને પવનની ગતિ કેટલી છે?'
          : currentLang === 'hi'
            ? 'समुद्री लहरों की ऊंचाई और हवा की गति क्या है?'
            : currentLang === 'mr'
              ? 'सागरी लाटांची उंची आणि वाऱ्याचा वेग किती आहे?'
              : currentLang === 'ta'
                ? 'கடல் அலை உயரம் மற்றும் காற்றின் வேகம் என்ன?'
                : currentLang === 'ml'
                  ? 'തിരമാല ഉയരവും കാറ്റിന്റെ വേഗതയും വ്യക്തമാക്കുക.'
                  : 'What are the significant wave heights and wind speeds?',
    },
    {
      id: 'cyclone',
      label: t.quickCyclone || 'Cyclone Alerts',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900',
      query:
        currentLang === 'gu'
          ? 'શું આપણા દરિયાકાંઠે વાવાઝોડા અથવા હાઈ-વેવ એલર્ટ છે?'
          : currentLang === 'hi'
            ? 'क्या हमारे क्षेत्र में कोई चक्रवात या उच्च लहर चेतावनी है?'
            : currentLang === 'mr'
              ? 'आमच्या भागात कोणतीही चक्रीवादळ किंवा उंच लाटांची चेतावणी आहे का?'
              : currentLang === 'ta'
                ? 'எங்கள் பகுதியில் புயல் எச்சரிக்கை உள்ளதா?'
                : currentLang === 'ml'
                  ? 'ചുഴലിക്കാറ്റ് മുന്നറിയിപ്പ് ഉണ്ടോ?'
                  : 'Are there any active cyclone or high swell alerts for our coordinates?',
    },
    {
      id: 'route',
      label: t.quickRoute || 'Safe Route',
      icon: Navigation,
      iconColor: 'text-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100/80 border-teal-200 text-teal-900',
      query:
        currentLang === 'gu'
          ? 'સૌથી નજીકના PFZ ઝોન માટે હવામાન-સુરક્ષિત નેવિગેશન માર્ગ દર્શાવો.'
          : currentLang === 'hi'
            ? 'निकटतम PFZ क्षेत्र के लिए सुरक्षित नेविगेशन मार्ग दिखाएं।'
            : currentLang === 'mr'
              ? 'जवळच्या PFZ क्षेत्रासाठी सुरक्षित जलमार्ग दाखवा.'
              : currentLang === 'ta'
                ? 'பாதுகாப்பான வழித்தடத்தை காட்டவும்.'
                : currentLang === 'ml'
                  ? 'സുരക്ഷിതമായ യാത്രാ മാർഗ്ഗം കാണിക്കുക.'
                  : 'Show the weather-safe navigation route to the nearest PFZ.',
    },
  ];

  return (
    <aside className="w-full lg:w-[420px] xl:w-[440px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden select-none">
      {/* 1. CHATBOT HEADER (Fixed) */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F766E] to-[#0284C7] flex items-center justify-center text-white text-sm shadow-xs font-bold">
            🌊
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black font-display text-slate-900 tracking-tight">
                {t.chatTitle || 'ORCA Marine Intelligence'}
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              {t.chatSubtitle || 'Agentic Decision Support Engine'}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Online Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
            <span>{t.onlineStatus || 'Online'}</span>
          </div>

          {/* Reset / Clear Chat Button */}
          {onResetChat && (
            <button
              onClick={onResetChat}
              title="Reset conversation"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Minimize / Expand Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Chat' : 'Minimize Quick Options'}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. CHATBOT QUICK ACTIONS (2 Buttons per Row Grid) */}
      {!isMinimized && (
        <div className="p-3 bg-slate-50/70 border-b border-slate-200/90 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>{t.quickOptionsTitle || 'Quick Options'}</span>
            </span>
          </div>

          {/* 2 Columns Grid (2 buttons per row) */}
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  disabled={isLoading}
                  onClick={() => onSendMessage(action.query)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${action.bgColor}`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${action.iconColor}`} />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CHATBOT CONVERSATION SCROLL AREA (Only this scrolls) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F7F9FC]/60">
        {messages.map((msg, index) => (
          <ChatMessage key={msg.id || index} message={msg} currentLang={currentLang} />
        ))}

        {/* Loading State Animation */}
        {isLoading && (
          <div className="flex justify-start items-start gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-sm shrink-0 shadow-2xs">
              🌊
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-white border border-teal-200 p-3.5 shadow-xs text-xs font-sans text-teal-900 flex items-center gap-3">
              <div className="relative flex items-center justify-center w-4 h-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0F766E]"></span>
              </div>
              <span className="font-semibold text-slate-700">
                {currentLang === 'gu'
                  ? 'ઓર્કા ડેટાનું સંશ્લેષણ કરી રહ્યું છે...'
                  : currentLang === 'hi'
                    ? 'ऑर्का समुद्री डेटा का विश्लेषण कर रहा है...'
                    : currentLang === 'mr'
                      ? 'ऑर्का डेटाचे विश्लेषण करत आहे...'
                      : 'ORCA is synthesizing marine evidence...'}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-rose-700 hover:text-rose-900 font-mono px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-[10px] font-bold border border-rose-300 cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. FIXED CHAT INPUT */}
      <QueryInput
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        currentLang={currentLang}
      />
    </aside>
  );
}
