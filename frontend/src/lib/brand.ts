/**
 * Single source of truth for Matsya brand constants, visual tokens,
 * public base URL config, and localized chatbot persona names.
 */

export const APP_NAME = "Matsya";
export const LOCALIZED_APP_NAMES: Record<string, string> = {
  en: "Matsya",
  hi: "मत्स्य",
  gu: "મત્સ્ય",
  mr: "मत्स्य",
  ta: "மத்ஸ்யா",
  te: "మత్స్య",
  ml: "മത്സ്യ",
  bn: "মৎস্য",
  kn: "ಮತ್ಸ್ಯ",
  or: "ମତ୍ସ୍ୟ",
  pa: "ਮਤਸਿਆ",
};

export function getLocalizedAppName(lang?: string | null): string {
  if (!lang) return APP_NAME;
  const code = lang.trim().toLowerCase().split("-")[0].split("_")[0];
  return LOCALIZED_APP_NAMES[code] ?? APP_NAME;
}

export const ENGINE_NAME = "ORCA";
export const ENGINE_FULL_NAME =
  "ORCA - Marine EcOsystem Reasoning with Collaborative Agents";
export const TAGLINE = "Matsya, powered by ORCA";
export const POWERED_BY = "powered by ORCA";

export const DEFAULT_PUBLIC_BASE_URL = "https://matsya.app";

export const BRAND_TOKENS = {
  teal: "#2FB5A3",
  softTeal: "#BDEFE6",
  blue: "#4AB3F4",
  ink: "#12232B",
  background: "#F2FAF8",
  darkBackground: "#0A181E",
  darkTile: "#10252D",
  darkInk: "#DDF7F2",
  darkRingFill: "#1C4A50",
} as const;

export function getPublicBaseUrl(): string {
  const configured = (
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_PUBLIC_BASE_URL ||
    ""
  ).trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return DEFAULT_PUBLIC_BASE_URL;
}

export interface AssistantPersona {
  latin: string;
  native: string;
  display: string;
  askLabel: string;
  placeholder: string;
  speakingLabel: string;
  voiceHint: string;
}

export const DEFAULT_ASSISTANT_PERSONA: AssistantPersona = {
  latin: "Sagar Mitra",
  native: "सागर मित्र",
  display: "Sagar Mitra",
  askLabel: "Ask Sagar Mitra",
  placeholder: "Ask Sagar Mitra about sea conditions, weather, or safety…",
  speakingLabel: "Sagar Mitra is speaking",
  voiceHint: "Speak, then pause. Sagar Mitra sends your question and reads the reply aloud.",
};

/**
 * Localized chatbot persona names keyed by user preferred_language (not by GPS or state).
 * Pending native-speaker review — edit in this single map only.
 */
export const ASSISTANT_PERSONAS: Record<string, AssistantPersona> = {
  gu: {
    latin: "Nakhuda",
    native: "નાખુદા",
    display: "નાખુદા",
    askLabel: "નાખુદા ને પૂછો",
    placeholder: "નાખુદા ને દરિયાની સ્થિતિ, હવામાન કે સલામતી વિશે પૂછો…",
    speakingLabel: "નાખુદા બોલે છે",
    voiceHint: "બોલો અને થોભો. નાખુદા તમારો પ્રશ્ન મોકલીને જવાબ બોલશે.",
  },
  mr: {
    latin: "Daryasarang",
    native: "दर्यासारंग",
    display: "दर्यासारंग",
    askLabel: "दर्यासारंगला विचारा",
    placeholder: "दर्यासारंगला समुद्रस्थिती, हवामान किंवा सुरक्षिततेबद्दल विचारा…",
    speakingLabel: "दर्यासारंग बोलत आहे",
    voiceHint: "बोला आणि थांबा. दर्यासारंग तुमचा प्रश्न पाठवून उत्तर वाचून दाखवेल.",
  },
  kn: {
    latin: "Ambiga",
    native: "ಅಂಬಿಗ",
    display: "ಅಂಬಿಗ",
    askLabel: "ಅಂಬಿಗನನ್ನು ಕೇಳಿ",
    placeholder: "ಅಂಬಿಗನನ್ನು ಸಮುದ್ರದ ಸ್ಥಿತಿ, ಹವಾಮಾನ ಅಥವಾ ಸುರಕ್ಷತೆ ಬಗ್ಗೆ ಕೇಳಿ…",
    speakingLabel: "ಅಂಬಿಗ ಮಾತನಾಡುತ್ತಿದೆ",
    voiceHint: "ಮಾತನಾಡಿ, ನಂತರ ವಿರಾಮ ನೀಡಿ. ಅಂಬಿಗ ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರವನ್ನು ಓದುತ್ತದೆ.",
  },
  ml: {
    latin: "Kappithan",
    native: "കപ്പിത്താൻ",
    display: "കപ്പിത്താൻ",
    askLabel: "കപ്പിത്താനോട് ചോദിക്കൂ",
    placeholder: "കപ്പിത്താനോട് കടൽ സാഹചര്യം, കാലാവസ്ഥ അല്ലെങ്കിൽ സുരക്ഷ ചോദിക്കൂ…",
    speakingLabel: "കപ്പിത്താൻ സംസാരിക്കുന്നു",
    voiceHint: "സംസാരിച്ചശേഷം നിർത്തുക. കപ്പിത്താൻ മറുപടി വായിച്ചു കേൾപ്പിക്കും.",
  },
  ta: {
    latin: "Kadal Thunai",
    native: "கடல் துணை",
    display: "கடல் துணை",
    askLabel: "கடல் துணையிடம் கேளுங்கள்",
    placeholder: "கடல் துணையிடம் கடல் நிலை, வானிலை அல்லது பாதுகாப்பு குறித்துக் கேளுங்கள்…",
    speakingLabel: "கடல் துணை பேசுகிறது",
    voiceHint: "பேசிவிட்டு நிறுத்தவும். கடல் துணை உங்கள் கேள்விக்குப் பதிலை வாசிக்கும்.",
  },
  bn: {
    latin: "Majhi",
    native: "মাঝি",
    display: "মাঝি",
    askLabel: "মাঝি-কে জিজ্ঞাসা করুন",
    placeholder: "মাঝি-কে সমুদ্রের অবস্থা, আবহাওয়া বা নিরাপত্তা সম্পর্কে জিজ্ঞাসা করুন…",
    speakingLabel: "মাঝি কথা বলছে",
    voiceHint: "কথা বলে থামুন। মাঝি আপনার প্রশ্ন পাঠিয়ে উত্তর পড়ে শোনাবে।",
  },
  or: {
    latin: "Majhi",
    native: "ମାଝି",
    display: "ମାଝି",
    askLabel: "ମାଝିଙ୍କୁ ପଚାରନ୍ତୁ",
    placeholder: "ମାଝିଙ୍କୁ ସମୁଦ୍ର ଅବସ୍ଥା, ପାଣିପାଗ କିମ୍ବା ସୁରକ୍ଷା ବିଷୟରେ ପଚାରନ୍ତୁ…",
    speakingLabel: "ମାଝି କହୁଛନ୍ତି",
    voiceHint: "କୁହନ୍ତୁ ଏବଂ ଅଟକନ୍ତୁ। ମାଝି ଆପଣଙ୍କ ପ୍ରଶ୍ନର ଉତ୍ତର ପଢ଼ି ଶୁଣାଇବେ।",
  },
  hi: {
    latin: "Sagar Mitra",
    native: "सागर मित्र",
    display: "सागर मित्र",
    askLabel: "सागर मित्र से पूछें",
    placeholder: "सागर मित्र से समुद्र की स्थिति, मौसम या सुरक्षा के बारे में पूछें…",
    speakingLabel: "सागर मित्र बोल रहा है",
    voiceHint: "बोलें और रुकें। सागर मित्र आपका प्रश्न भेजकर उत्तर बोलेगा।",
  },
  te: {
    latin: "Sagar Mitra",
    native: "सागर मित्र",
    display: "Sagar Mitra",
    askLabel: "Sagar Mitra ని అడగండి",
    placeholder: "Sagar Mitra ని సముద్ర పరిస్థితులు, వాతావరణం లేదా భద్రత గురించి అడగండి…",
    speakingLabel: "Sagar Mitra మాట్లాడుతోంది",
    voiceHint: "మాట్లాడి ఆగండి. Sagar Mitra మీ ప్రశ్నకు సమాధానం చదివి వినిపిస్తుంది.",
  },
  en: DEFAULT_ASSISTANT_PERSONA,
  pa: {
    latin: "Sagar Mitra",
    native: "सागर मित्र",
    display: "Sagar Mitra",
    askLabel: "Sagar Mitra ਨੂੰ ਪੁੱਛੋ",
    placeholder: "Sagar Mitra ਨੂੰ ਸਮੁੰਦਰ ਦੀ ਸਥਿਤੀ, ਮੌਸਮ ਜਾਂ ਸੁਰੱਖਿਆ ਬਾਰੇ ਪੁੱਛੋ…",
    speakingLabel: "Sagar Mitra ਬੋਲ ਰਿਹਾ ਹੈ",
    voiceHint: "ਬੋਲੋ ਅਤੇ ਰੁਕੋ। Sagar Mitra ਤੁਹਾਡੇ ਸਵਾਲ ਦਾ ਜਵਾਬ ਪੜ੍ਹ ਕੇ ਸੁਣਾਵੇਗਾ।",
  },
};

export function getAssistantPersona(lang?: string | null): AssistantPersona {
  if (!lang) return DEFAULT_ASSISTANT_PERSONA;
  const code = lang.trim().toLowerCase().split("-")[0].split("_")[0];
  return ASSISTANT_PERSONAS[code] ?? DEFAULT_ASSISTANT_PERSONA;
}

export function askAssistantLabel(lang?: string | null): string {
  return getAssistantPersona(lang).askLabel;
}
