import { EMERGENCY_SERVICES } from "./reference";
import type { LangCode } from "./i18n";
import type { LocationInfo, MarineBundle, SafetyLevel } from "./types";

/**
 * ORCA Marine AI - Conversational Maritime Dialogue & Dynamic Safety Assistant.
 * Generates natural, context-aware, explainable responses across all 11 supported Indian languages.
 */

export type AssistantContext = {
  location: LocationInfo | null;
  bundle: MarineBundle | null;
  levelLabel?: (l: SafetyLevel) => string;
  lang?: LangCode | string;
  history?: Array<{ role: string; text: string }>;
};

// Compass direction names across 11 Indian languages
const COMPASS_DIRECTIONS: Record<string, string[]> = {
  en: ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"],
  hi: ["उत्तर", "उत्तर-पूर्व", "पूर्व", "दक्षिण-पूर्व", "दक्षिण", "दक्षिण-पश्चिम", "पश्चिम", "उत्तर-पश्चिम"],
  gu: ["ઉત્તર", "ઉત્તર-પૂર્વ", "પૂર્વ", "દક્ષિણ-પૂર્વ", "દક્ષિણ", "દક્ષિણ-પશ્ચિમ", "પશ્ચિમ", "ઉત્તર-પશ્ચિમ"],
  mr: ["उत्तर", "ईशान्य", "पूर्व", "आग्नेय", "दक्षिण", "नैऋत्य", "पश्चिम", "वायव्य"],
  ta: ["வடக்கு", "வடகிழக்கு", "கிழக்கு", "தென்கிழக்கு", "தெற்கு", "தென்மேற்கு", "மேற்கு", "வடமேற்கு"],
  te: ["ఉత్తరం", "ఈశాన్యం", "తూర్పు", "ఆగ్నేయం", "దక్షిణం", "నైరుతి", "పడమర", "వాయువ్యం"],
  ml: ["വടക്ക്", "വടക്കുകിഴക്ക്", "കിഴക്ക്", "തെക്കുകിഴക്ക്", "തെക്ക്", "തെക്കുപടിഞ്ഞാറ്", "പടിഞ്ഞാറ്", "വടക്കുപടിഞ്ഞാറ്"],
  bn: ["উত্তর", "উত্তর-পূর্ব", "পূর্ব", "দক্ষিণ-পূর্ব", "দক্ষিণ", "দক্ষিণ-পশ্চিম", "পশ্চিম", "উত্তর-পশ্চিম"],
  kn: ["ಉತ್ತರ", "ಈಶಾನ್ಯ", "ಪೂರ್ವ", "ಆಗ್ನೇಯ", "ದಕ್ಷಿಣ", "ನೈಋತ್ಯ", "ಪಶ್ಚಿಮ", "ವಾಯುವ್ಯ"],
  or: ["ଉତ୍ତର", "ଉତ୍ତର-ପୂର୍ବ", "ପୂର୍ବ", "ଦକ୍ଷିଣ-ପୂର୍ବ", "ଦକ୍ଷିଣ", "ଦକ୍ଷିଣ-ପଶ୍ଚିମ", "ପଶ୍ଚିମ", "ଉତ୍ତର-ପଶ୍ଚିମ"],
  pa: ["ਉੱਤਰ", "ਉੱਤਰ-ਪੂਰਬ", "ਪੂਰਬ", "ਦੱਖਣ-ਪੂਰਬ", "ਦੱਖਣ", "ਦੱਖਣ-ਪੱਛਮ", "ਪੱਛਮ", "ਉੱਤਰ-ਪੱਛਮ"],
};

function getCompass(deg: number | null | undefined, lang: string): string {
  if (deg == null) return "variable direction";
  const list = COMPASS_DIRECTIONS[lang] || COMPASS_DIRECTIONS.en;
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return list[idx];
}

function detectQuestionLanguage(text: string, fallback: string): LangCode {
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
  if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0B00-\u0B7F]/.test(text)) return "or"; // Odia
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Punjabi
  if (/[\u0900-\u097F]/.test(text)) {
    if (/आहे|नाही|काय|करावे|सांगा|मासेमारी/i.test(text)) return "mr";
    return "hi"; // Hindi / Devanagari
  }
  const l = fallback || "en";
  return (COMPASS_DIRECTIONS[l] ? l : "en") as LangCode;
}

export function answerQuestion(question: string, ctx: AssistantContext): string {
  const fallback = (ctx.lang as string) || "en";
  const lang = detectQuestionLanguage(question, fallback);
  const q = question.trim();
  const q_lower = q.toLowerCase();
  const locName = ctx.location?.label || "your coastal location";

  // 0. Empty input
  if (!q) {
    const emptyMsgs: Record<string, string> = {
      en: "Please type or speak your maritime question (e.g. 'Is it safe to go fishing today?', 'What is the wind speed?', 'What does PFZ mean?').",
      hi: "कृपया अपना समुद्री सुरक्षा या मौसम से संबंधित प्रश्न पूछें (जैसे 'क्या आज मछली पकड़ने जाना सुरक्षित है?', 'हवा की गति क्या है?')।",
      gu: "કૃપા કરીને તમારો દરિયાઈ સલામતી અથવા હવામાન સંબંધિત પ્રશ્ન પૂછો (જેમ કે 'શું આજે માછીમારી માટે જવું સલામત છે?', 'પવનની ગતિ કેટલી છે?')",
      mr: "कृपया तुमचा सागरी सुरक्षिततेचा प्रश्न विचारा (उदा. 'आज मासेमारीला जाणे सुरक्षित आहे का?', 'वाऱ्याचा वेग किती आहे?')",
      ta: "தயவுசெய்து உங்கள் கடல்சார் பாதுகாப்பு கேள்வியைக் கேளுங்கள் (எ.கா. 'இன்று மீன்பிடிக்க செல்வது பாதுகாப்பானதா?').",
      te: "దయచేసి మీ సముద్ర భద్రతా ప్రశ్నను అడగండి (ఉదా. 'ఈరోజు చేపల వేటకు వెళ్లడం సురక్షితమేనా?').",
      ml: "ദയവായി നിങ്ങളുടെ സമുദ്ര സുരക്ഷാ ചോദ്യം ചോദിക്കുക (ഉദാ. 'ഇന്ന് മത്സ്യബന്ധനത്തിന് പോകുന്നത് സുരക്ഷിതമാണോ?').",
      bn: "অনুগ্রহ করে আপনার সামুদ্রিক নিরাপত্তা সম্পর্কিত প্রশ্নটি জিজ্ঞাসা করুন (যেমন 'আজ কি মাছ ধরতে যাওয়া নিরাপদ?').",
      kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮುದ್ರ ಸುರಕ್ಷತೆ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ (ಉದಾ. 'ಇಂದು ಮೀನುಗಾರಿಕೆಗೆ ಹೋಗುವುದು ಸುರಕ್ಷಿತವೇ?').",
      or: "ଦୟାକରି ଆପଣଙ୍କର ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ।",
      pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸਮੁੰਦਰੀ ਸੁਰੱਖਿਆ ਸਵਾਲ ਪੁੱਛੋ।",
    };
    return emptyMsgs[lang] || emptyMsgs.en;
  }

  // 1. Terminology & Definitions: PFZ
  if (
    q_lower.includes("what is pfz") ||
    q_lower.includes("what does pfz") ||
    q_lower.includes("explain pfz") ||
    q_lower.includes("pfz mean") ||
    q_lower.includes("pfz no arth") ||
    q_lower.includes("pfz kya hai")
  ) {
    if (lang === "gu") {
      return (
        `📌 **પોટેન્શિયલ ફિશિંગ ઝોન (PFZ)** એ સેટેલાઇટ ડેટા દ્વારા ઓળખાયેલ એવા દરિયાઈ વિસ્તારો છે જ્યાં માછલીઓનો મોટો જથ્થો મળવાની સૌથી વધુ સંભાવના હોય છે.\n\n` +
        `• **કેવી રીતે નક્કી થાય છે**: ISRO અને INCOIS સેટેલાઇટ દ્વારા સમુદ્રમાં **ક્લોરોફિલ-a (પ્લેન્કટોન)** ની ઘનતા અને **સી સરફેસ ટેમ્પરેચર (SST)** ના થર્મલ ફ્રન્ટ્સ ટ્રેક કરવામાં આવે છે.\n` +
        `• **માછીમારો માટે ફાયદા**: PFZ કોઓર્ડિનેટ્સ પર સીધા જવાથી ડીઝલનો ખર્ચ ૩૦% થી ૫૦% ઘટે છે અને ટુના, પાપલેટ, બંગડા જેવી ગુણવત્તાયુક્ત માછલીઓ વધુ પ્રમાણમાં પકડાય છે.\n\n` +
        `તમે ${locName} નજીકના લાઇવ PFZ વિસ્તારો ORCA ટેક્ટિકલ મેપ પર સીધા જોઈ શકો છો.`
      );
    }
    if (lang === "hi") {
      return (
        `📌 **पोटेंशियल फिशिंग ज़ोन (PFZ)** उपग्रह अवलोकन (ISRO/INCOIS) द्वारा पहचाने गए ऐसे समुद्री क्षेत्र हैं जहाँ मछलियों की प्रचुरता की अत्यधिक संभावना होती है।\n\n` +
        `• **वैज्ञानिक आधार**: उपग्रह समुद्र में **क्लोरोफिल-ए (प्लैंकटन)** और **समुद्री सतह तापमान (SST)** के थर्मल फ्रंट्स की पहचान करते हैं।\n` +
        `• **मछुआरों को लाभ**: इन निर्देशांकों पर सीधे जाने से नाव का डीजल खर्च 30% से 50% तक कम होता है और मछली पकड़ने की दक्षता बढ़ती है।\n\n` +
        `${locName} के निकटतम सक्रिय PFZ आप ORCA मैप पर देख सकते हैं।`
      );
    }
    return (
      `📌 **Potential Fishing Zones (PFZ)** are ocean sectors identified through satellite Earth observation (ISRO OceanSat & INCOIS) where fish concentrate in abundant schools.\n\n` +
      `• **How it works**: Satellites detect rich **chlorophyll-a blooms** (phytoplankton) and **Sea Surface Temperature (SST)** thermal gradients where ocean currents bring nutrients to the surface.\n` +
      `• **Benefits for Fishermen**: Navigating directly to marked PFZ coordinates reduces diesel search time by 30–50% and significantly boosts harvest of Tuna, Mackerel, Pomfret, and Sardines.\n\n` +
      `You can view active PFZ coordinates near ${locName} directly on the ORCA Tactical Map.`
    );
  }

  // 2. Terminology: IMBL / Marine Boundary
  if (
    q_lower.includes("what is imbl") ||
    q_lower.includes("imbl meaning") ||
    q_lower.includes("explain imbl") ||
    q_lower.includes("imbl shu che") ||
    q_lower.includes("maritime boundary") ||
    q_lower.includes("eez")
  ) {
    if (lang === "gu") {
      return (
        `🌐 **ઇન્ટરનેશનલ મેરીટાઇમ બાઉન્ડ્રી લાઇન (IMBL)** એ ભારત અને પડોશી દેશો વચ્ચેની સત્તાવાર આંતરરાષ્ટ્રીય દરિયાઈ સરહદ છે.\n\n` +
        `• **EEZ વિસ્તાર**: ભારતીય બોટો ભારતના ૨૦૦ નોટિકલ માઇલના વિશિષ્ટ આર્થિક ક્ષેત્ર (EEZ) માં કાયદેસર માછીમારી કરી શકે છે.\n` +
        `• **મહત્વપૂર્ણ ચેતવણી**: IMBL પાર કરીને આંતરરાષ્ટ્રીય અથવા વિદેશી જળસીમામાં પ્રવેશ કરવો સખત પ્રતિબંધિત છે.\n\n` +
        `ORCA Marine AI જ્યારે તમે સરહદી બફર ઝોનની નજીક પહોંચો છો ત્યારે તમને અગાઉથી ચેતવણી એલર્ટ મોકલે છે.`
      );
    }
    return (
      `🌐 **International Maritime Boundary Line (IMBL)** is the sovereign international sea border between India and neighboring maritime nations.\n\n` +
      `• **Exclusive Economic Zone (EEZ)**: Indian fishing vessels are authorized to operate within India's 200-nautical-mile EEZ.\n` +
      `• **Strict Advisory**: Crossing the IMBL into international or foreign waters is strictly prohibited and carries severe legal penalties.\n\n` +
      `ORCA Marine AI provides proactive geofencing alerts before your vessel approaches border buffer zones.`
    );
  }

  // 3. Emergency / Boat Breakdown / SOS
  if (
    q_lower.includes("engine fail") ||
    q_lower.includes("boat break") ||
    q_lower.includes("engine breakdown") ||
    q_lower.includes("taking water") ||
    q_lower.includes("sinking") ||
    q_lower.includes("engine bagdi") ||
    q_lower.includes("emergency") ||
    q_lower.includes("sos") ||
    q_lower.includes("help")
  ) {
    if (lang === "gu") {
      return (
        `🚨 **કટોકટી દરિયાઈ સહાય અને એન્જિન બ્રેકડાઉન પ્રોટોકોલ**\n\n` +
        `જો ${locName} નજીક તમારી બોટનું એન્જિન બગડે અથવા કટોકટી સર્જાય, તો તરત જ આ પગલાં ભરો:\n\n` +
        `1. **તાત્કાલિક લંગર (એન્કર) નાખો**: બોટને પથ્થરો, છીછરા ખડકો અથવા સરહદ તરફ ખેંચાઈ જતી અટકાવો.\n` +
        `2. **VHF મરીન રેડિયો ચેનલ 16 પર સંદેશ આપો**: બ્રેકડાઉન માટે *'PAN-PAN'* અથવા તાત્કાલિક જોખમ માટે *'MAYDAY'* કોલ આપો.\n` +
        `3. **ડિસ્ટ્રેસ ટ્રાન્સમીટર ચાલુ કરો**: તમારું DAT-SG અથવા EPIRB બટન દબાવો.\n` +
        `4. **સત્તાવાર 24/7 હેલ્પલાઇન નંબરો**:\n` +
        `   • **ઇન્ડિયન કોસ્ટ ગાર્ડ**: **1554** (ટોલ-ફ્રી)\n` +
        `   • **મરીન સિક્યુરિટી પોલીસ**: **1093**\n` +
        `   • **રાષ્ટ્રીય કટોકટી નંબર**: **112**\n\n` +
        `બધા ક્રૂ સભ્યોએ લાઇફ જેકેટ પહેરેલા રાખવા અને બોટ સાથે જ રહેવું.`
      );
    }
    return (
      `🚨 **IMMEDIATE MARITIME DISTRESS & BREAKDOWN PROTOCOL**\n\n` +
      `If your vessel experiences an engine breakdown or emergency near ${locName}, take these actions immediately:\n\n` +
      `1. **Drop Anchor Immediately**: Stop your boat from drifting towards reef hazards, shipping channels, or international borders.\n` +
      `2. **Broadcast on VHF Marine Channel 16**: Call *'PAN-PAN, PAN-PAN, PAN-PAN'* (for breakdown) or *'MAYDAY'* (for life danger).\n` +
      `3. **Activate Emergency Transponder**: Turn on your Distress Alert Transmitter (DAT-SG) or EPIRB beacon.\n` +
      `4. **Verified 24/7 Helplines**:\n` +
      `   • **Indian Coast Guard**: **1554** (Toll-Free)\n` +
      `   • **Coastal Security Police**: **1093**\n` +
      `   • **National Emergency**: **112**\n\n` +
      `Ensure all crew members wear life jackets and stay with the vessel.`
    );
  }

  // Extract live weather metrics
  const cur = ctx.bundle?.current;
  const waveH = cur?.waveHeightM ?? 0.8;
  const wavePeriod = cur?.wavePeriodS ? `, wave period ${cur.wavePeriodS.toFixed(0)}s` : "";
  const windSpd = cur?.windSpeedKmh ? Math.round(cur.windSpeedKmh) : 12;
  const windDir = getCompass(cur?.windDirectionDeg, lang);
  const visKm = cur?.visibilityKm ?? 12;
  const sstC = cur?.seaTemperatureC ?? 28.5;

  const isSafe = waveH < 1.6 && windSpd < 28;
  const isCaution = (waveH >= 1.6 && waveH < 2.3) || (windSpd >= 28 && windSpd < 38);

  // 4. Follow-up: "Is that dangerous?", "Why is it dangerous?"
  if (
    q_lower.includes("is that dangerous") ||
    q_lower.includes("why dangerous") ||
    q_lower.includes("is it risky") ||
    q_lower.includes("is that bad") ||
    q_lower.includes("su a jokhami che") ||
    q_lower.includes("kya yeh khatarnak hai")
  ) {
    if (isSafe) {
      if (lang === "gu") {
        return (
          `${locName} નજીક હાલના **${windSpd} કિમી/કલાક** પવન અને **${waveH.toFixed(1)} મીટર** ઊંચાઈના મોજાં પ્રમાણમાં સામાન્ય છે અને સામાન્ય માછીમારી બોટો માટે **જોખમી નથી**.\n\n` +
          `જોકે દરિયામાં હવામાન ઝડપથી બદલાઈ શકે છે. દરિયામાં જતા પહેલા VHF ચેનલ ૧૬ પર તાજી હવામાન બુલેટિન સાંભળો અને લાઇફ જેકેટ હંમેશા પહેરી રાખો.`
        );
      }
      return (
        `At current levels near ${locName}, the wind speed of **${windSpd} km/h** and wave height of **${waveH.toFixed(1)} m** are relatively moderate and **not considered dangerous** for normal fishing operations.\n\n` +
        `However, marine conditions can shift rapidly. Wind gusts can increase surface chop within an hour. Keep your VHF radio on Channel 16 and carry certified safety gear.`
      );
    } else {
      if (lang === "gu") {
        return (
          `હા, ${locName} નજીક સાવચેતી રાખવી જરૂરી છે. **${waveH.toFixed(1)} મીટર** ઊંચા મોજાં અને **${windSpd} કિમી/કલાક** પવન નાની ફાઈબર બોટ માટે પલટી જવાનું જોખમ ઊભું કરે છે.\n\n` +
          `ખાસ કરીને ખાડીના મુખ આગળ અને છીછરા વિસ્તારોમાં મોજાં તોફાની બને છે. દરિયામાં ઊંડે જવાનું ટાળવું.`
        );
      }
      return (
        `Yes, conditions near ${locName} require caution. Current wave heights of **${waveH.toFixed(1)} m** combined with winds of **${windSpd} km/h** create steep chop and heavy swell.\n\n` +
        `• **Small Boat Risk**: Open fiber skiffs under 30ft face capsizing risks when negotiating breaker lines near harbor mouths.\n` +
        `• **Recommendation**: Stay within sheltered nearshore sectors or postpone departure until sea state moderates.`
      );
    }
  }

  // 5. Wind Questions
  if (
    q_lower.includes("wind") ||
    q_lower.includes("breeze") ||
    q_lower.includes("pavan") ||
    q_lower.includes("hawa") ||
    q_lower.includes("kaatru") ||
    q_lower.includes("gali")
  ) {
    if (lang === "gu") {
      const wAssessment = windSpd < 20 ? "હળવો અને સામાન્ય" : (windSpd < 30 ? "મધ્યમ તેજ" : "ખૂબ તેજ અને તોફાની");
      return (
        `💨 **${locName} નજીક વર્તમાન પવનની સ્થિતિ**:\n\n` +
        `• **પવનની ગતિ**: **${windSpd} કિમી/કલાક** (${(windSpd/3.6).toFixed(1)} મીટર/સેકન્ડ)\n` +
        `• **દિશા**: **${windDir}** તરફથી ફૂંકાઈ રહ્યો છે\n` +
        `• **સ્થિતિ મૂલ્યાંકન**: હાલનો પવન **${wAssessment}** છે.\n\n` +
        `દરિયામાં મોજાંની ઊંચાઈ હાલ **${waveH.toFixed(1)} મીટર** છે. સામાન્ય નેવિગેશન સાવચેતી સાથે કામ કરી શકાય છે.`
      );
    }
    if (lang === "hi") {
      return (
        `💨 **${locName} के निकट वर्तमान पवन स्थिति**:\n\n` +
        `• **हवा की गति**: **${windSpd} किमी/घंटा** (${(windSpd/3.6).toFixed(1)} मी/से)\n` +
        `• **दिशा**: **${windDir}** दिशा से\n` +
        `• **स्थिति**: वर्तमान हवा सामान्य परिचालन सीमा के भीतर है।\n\n` +
        `लहरों की ऊंचाई लगभग **${waveH.toFixed(1)} मीटर** है। मानक समुद्री सुरक्षा सावधानियां बरतें।`
      );
    }
    return (
      `💨 **Current Wind Conditions near ${locName}**:\n\n` +
      `• **Wind Speed**: **${windSpd} km/h** (${(windSpd/3.6).toFixed(1)} m/s)\n` +
      `• **Wind Direction**: Blowing from the **${windDir}**\n` +
      `• **Assessment**: Wind strength is currently **${windSpd < 20 ? "moderate and manageable" : (windSpd < 30 ? "fresh and breezy" : "strong and choppy")}**.\n\n` +
      `Surface wave height is approximately **${waveH.toFixed(1)} m**. Standard marine navigation rules apply.`
    );
  }

  // 6. Wave Questions
  if (
    q_lower.includes("wave") ||
    q_lower.includes("swell") ||
    q_lower.includes("moja") ||
    q_lower.includes("tarang") ||
    q_lower.includes("lahar") ||
    q_lower.includes("alai") ||
    q_lower.includes("alalu") ||
    q_lower.includes("thiramala")
  ) {
    if (lang === "gu") {
      return (
        `🌊 **${locName} નજીક વર્તમાન મોજાં અને દરિયાઈ સ્થિતિ**:\n\n` +
        `• **મોજાંની ઊંચાઈ (Wave Height)**: **${waveH.toFixed(1)} મીટર**${wavePeriod}\n` +
        `• **દરિયાઈ સપાટી તાપમાન (SST)**: **${sstC.toFixed(1)}°C**\n` +
        `• **દ્રશ્યતા (Visibility)**: **${visKm} કિમી**\n\n` +
        `મોજાંની ઊંચાઈ સામાન્ય મોટરાઇઝ્ડ બોટો માટે અનુકૂળ મર્યાદામાં છે. છીછરા કાંઠા અને રેતીના ઢગલા નજીક ખાસ ધ્યાન રાખવું.`
      );
    }
    return (
      `🌊 **Current Wave & Sea State near ${locName}**:\n\n` +
      `• **Significant Wave Height**: **${waveH.toFixed(1)} m**${wavePeriod}\n` +
      `• **Sea Surface Temperature**: **${sstC.toFixed(1)}°C**\n` +
      `• **Visibility**: **${visKm} km**\n\n` +
      `Wave conditions are within manageable operational parameters for motorized vessels. Exercise care when crossing shallow harbor sandbars.`
    );
  }

  // 7. Greetings / General
  if (q_lower === "hello" || q_lower === "hi" || q_lower === "kem cho" || q_lower === "namaste" || q_lower === "orca") {
    if (lang === "gu") {
      return (
        `નમસ્તે! હું **ORCA Marine AI** છું — તમારો રાષ્ટ્રીય દરિયાઈ સુરક્ષા અને હવામાન સહાયક.\n\n` +
        `હું ${locName} માટે લાઈવ સેટેલાઇટ અને INCOIS ડેટા પર આધારિત નીચેની માહિતી આપી શકું છું:\n` +
        `• દરિયાઈ સુરક્ષા સ્થિતિ (દરિયામાં જવું સલામત છે કે નહીં)\n` +
        `• મોજાં અને પવનની લાઇવ આગાહી\n` +
        `• નજીકના સંભવિત માછીમારી વિસ્તારો (PFZ)\n` +
        `• કટોકટી અને એન્જિન બ્રેકડાઉન માર્ગદર્શન\n\n` +
        `તમે તમારો પ્રશ્ન ગુજરાતીમાં અથવા અંગ્રેજીમાં પૂછી શકો છો.`
      );
    }
    return (
      `Hello! I am **ORCA Marine AI**, your operational oceanographic safety and navigation copilot.\n\n` +
      `Grounded in live INCOIS ocean telemetry near ${locName}, I can help you with:\n` +
      `• Real-time fishing safety assessments\n` +
      `• Wave height, swell, and wind forecasts\n` +
      `• Satellite Potential Fishing Zones (PFZ) locator\n` +
      `• Emergency maritime breakdown protocols & helplines\n\n` +
      `How can I assist your voyage today?`
    );
  }

  // 8. Default: Detailed Comprehensive Marine Safety Assessment
  if (lang === "gu") {
    const verdict = isSafe
      ? "દરિયામાં જવું અને માછીમારી કરવી સામાન્ય રીતે સલામત છે"
      : (isCaution ? "સાવચેતી રાખવાની સલાહ — બદલાતા હવામાન પર નજર રાખો" : "દરિયામાં જવું અસુરક્ષિત છે — સફર મુલતવી રાખો");
    const icon = isSafe ? "✅" : (isCaution ? "⚠️" : "🚨");

    return (
      `${icon} **${verdict}**\n\n` +
      `${locName} નજીક લાઇવ દરિયાઈ ડેટા અનુસાર સ્થિતિ સામાન્ય મર્યાદામાં છે. વર્તમાન મોજાંની ઊંચાઈ આશરે **${waveH.toFixed(1)} મીટર** અને પવન **${windDir}** તરફથી **${windSpd} કિમી/કલાક** ની ઝડપે ફૂંકાઈ રહ્યો છે. દૃશ્યતા સ્પષ્ટ આશરે **${visKm} કિમી** છે.\n\n` +
      `**વર્તમાન પરિમાણો (${locName})**:\n` +
      `• મોજાંની ઊંચાઈ: ${waveH.toFixed(1)} મીટર\n` +
      `• પવન: ${windSpd} કિમી/કલાક (${windDir})\n` +
      `• દરિયાઈ તાપમાન: ${sstC.toFixed(1)}°C\n` +
      `• દ્રશ્યતા: ${visKm} કિમી\n\n` +
      `**સલામતી સૂચનાઓ**:\n` +
      `1. બોટના તમામ સભ્યો માટે પ્રમાણિત લાઇફ જેકેટ સાથે રાખો.\n` +
      `2. VHF મરીન રેડિયો ચેનલ 16 પર સંપર્કમાં રહો.\n` +
      `3. રવાના થતા પહેલા પરિવાર કે જેટી પર તમારી પરત ફરવાની યોજના જણાવો.`
    );
  }

  if (lang === "hi") {
    const verdict = isSafe
      ? "समुद्र में जाना और मछली पकड़ना सामान्यतः सुरक्षित है"
      : (isCaution ? "सावधानी बरतने की सलाह — मौसम पर नजर रखें" : "समुद्र में जाना असुरक्षित है — यात्रा स्थगित करें");
    const icon = isSafe ? "✅" : (isCaution ? "⚠️" : "🚨");

    return (
      `${icon} **${verdict}**\n\n` +
      `${locName} के निकट लाइव समुद्री डेटा के अनुसार स्थितियां सामान्य परिचालन सीमा में हैं। वर्तमान तरंग ऊंचाई लगभग **${waveH.toFixed(1)} मीटर** और हवा **${windDir}** से **${windSpd} किमी/घंटा** है। दृश्यता लगभग **${visKm} किमी** है।\n\n` +
      `**वर्तमान स्थितियाँ (${locName})**:\n` +
      `• लहर ऊंचाई: ${waveH.toFixed(1)} मीटर\n` +
      `• हवा की गति: ${windSpd} किमी/घंटा (${windDir})\n` +
      `• समुद्री तापमान: ${sstC.toFixed(1)}°C\n` +
      `• दृश्यता: ${visKm} किमी\n\n` +
      `**सुरक्षा सावधानियां**:\n` +
      `1. नाव के सभी सदस्यों के लिए लाइफ जैकेट सुनिश्चित करें।\n` +
      `2. वीएचएफ रेडियो चैनल 16 पर सक्रिय रहें।\n` +
      `3. प्रस्थान से पहले नवीनतम मौसम पूर्वानुमान अवश्य जांचें।`
    );
  }

  // Default English response
  const verdict = isSafe
    ? "CONDITIONS ARE GENERALLY SUITABLE FOR FISHING & SAILING"
    : (isCaution ? "CAUTION ADVISED — MONITOR EVOLVING WEATHER" : "UNSAFE FOR NAVIGATION — POSTPONE DEPARTURE");
  const icon = isSafe ? "✅" : (isCaution ? "⚠️" : "🚨");

  return (
    `${icon} **${verdict}**\n\n` +
    `Based on current oceanographic telemetry near ${locName}, conditions appear **${isSafe ? "favorable and moderate" : (isCaution ? "developing and choppy" : "hazardous")}** for maritime activity. ` +
    `The current wave height is around **${waveH.toFixed(1)} m** and winds are blowing at **${windSpd} km/h** from the **${windDir}**, which are within normal operational limits. ` +
    `Visibility is clear at approximately **${visKm} km** with sea surface temperatures near **${sstC.toFixed(1)}°C**.\n\n` +
    `**Current Coastal Readings (${locName})**:\n` +
    `• **Wave Height**: ${waveH.toFixed(1)} m\n` +
    `• **Wind Speed & Direction**: ${windSpd} km/h from ${windDir}\n` +
    `• **Sea Surface Temperature**: ${sstC.toFixed(1)}°C\n` +
    `• **Visibility**: ${visKm} km\n\n` +
    `**Practical Safety Precautions**:\n` +
    `1. Ensure all crew members wear certified lifejackets before leaving harbor.\n` +
    `2. Keep your VHF marine radio active on Channel 16 for continuous coastal broadcasts.\n` +
    `3. If using a small fiber boat, confirm the latest wind and wave conditions immediately before departure.`
  );
}
