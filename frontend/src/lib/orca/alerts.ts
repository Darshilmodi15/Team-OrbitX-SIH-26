import type { Alert, MarineBundle } from "./types";
import type { LangCode } from "./i18n";

/**
 * Advisories derived from live observed marine conditions with full 11-language localization.
 * Every advisory is produced from a measured value returned by the
 * marine/weather service for the user's own coordinates.
 */
export function deriveAdvisories(bundle: MarineBundle | null, lang: LangCode = "en"): Alert[] {
  if (!bundle) return [];
  const c = bundle.current;
  const at = new Date(bundle.current.fetchedAt || Date.now()).toISOString();
  const out: Alert[] = [];

  const waveTitles: Record<LangCode, string> = {
    en: "High wave conditions",
    hi: "ऊंची लहरों की स्थिति",
    gu: "ઊંચા મોજાંની સ્થિતિ",
    mr: "उंच लाटांची परिस्थिती",
    ta: "உயர்ந்த அலை நிலைமை",
    te: "ఎత్తైన అలల పరిస్థితులు",
    ml: "ഉയർന്ന തിരമാല മുന്നറിയിപ്പ്",
    bn: "উচ্চ তরঙ্গের পরিস্থিতি",
    kn: "ಹೆಚ್ಚಿನ ಅಲೆಗಳ ಪರಿಸ್ಥಿತಿ",
    or: "ଉଚ୍ଚ ତରଙ୍ଗ ସ୍ଥିତି",
    pa: "ਉੱਚੀਆਂ ਲਹਿਰਾਂ ਦੀ ਸਥਿਤੀ",
  };

  const waveBodies: Record<LangCode, (h: string) => string> = {
    en: (h) => `Observed significant wave height is ${h} m at your location. Small craft should avoid going out.`,
    hi: (h) => `आपके स्थान पर महत्वपूर्ण लहर की ऊंचाई ${h} मीटर दर्ज की गई है। छोटी नावों को समुद्र में जाने से बचना चाहिए।`,
    gu: (h) => `તમારા સ્થાન પર મોજાંની નોંધપાત્ર ઊંચાઈ ${h} મીટર નોંધાઈ છે. નાની બોટોએ દરિયામાં જવાનું ટાળવું જોઈએ.`,
    mr: (h) => `तुमच्या स्थानावर लाटांची उंची ${h} मीटर नोंदवली गेली आहे. लहान बोटींनी समुद्रात जाणे टाळावे.`,
    ta: (h) => `உங்கள் இடத்தில் அலையின் உயரம் ${h} மீ ஆக பதிவாகியுள்ளது. சிறிய படகுகள் கடலுக்குள் செல்வதைத் தவிர்க்க வேண்டும்.`,
    te: (h) => `మీ ప్రాంతంలో అలల ఎత్తు ${h} మీటర్లుగా నమోదైంది. చిన్న పడవలు సముద్రంలోకి వెళ్లడం నివారించాలి.`,
    ml: (h) => `നിങ്ങളുടെ ലൊക്കേഷനിൽ തിരമാലകളുടെ ഉയരം ${h} മീറ്റർ ആയി രേഖപ്പെടുത്തിയിരിക്കുന്നു. ചെറിയ വള്ളങ്ങൾ കടലിൽ പോകുന്നത് ഒഴിവാക്കണം.`,
    bn: (h) => `আপনার অবস্থানে তরঙ্গের উচ্চতা ${h} মিটার লক্ষ্য করা গেছে। ছোট নৌকাগুলির সমুদ্রে যাওয়া এড়ানো উচিত।`,
    kn: (h) => `ನಿಮ್ಮ ಸ್ಥಳದಲ್ಲಿ ಅಲೆಗಳ ಎತ್ತರ ${h} ಮೀಟರ್ ದಾಖಲಾಗಿದೆ. ಸಣ್ಣ ದೋಣಿಗಳು ಸಮುದ್ರಕ್ಕೆ ಹೋಗುವುದನ್ನು ತಪ್ಪಿಸಬೇಕು.`,
    or: (h) => `ଆପଣଙ୍କ ସ୍ଥାନରେ ତରଙ୍ଗ ଉଚ୍ଚତା ${h} ମିଟର ରେକର୍ଡ ହୋଇଛି। ଛୋଟ ଡଙ୍ଗାଗୁଡ଼ିକ ସମୁଦ୍ରକୁ ଯିବା ଉଚିତ୍ ନୁହେଁ।`,
    pa: (h) => `ਤੁਹਾਡੇ ਟਿਕਾਣੇ 'ਤੇ ਲਹਿਰਾਂ ਦੀ ਉਚਾਈ ${h} ਮੀਟਰ ਦਰਜ ਕੀਤੀ ਗਈ ਹੈ। ਛੋਟੀਆਂ ਕਿਸ਼ਤੀਆਂ ਨੂੰ ਸਮੁੰਦਰ ਵਿੱਚ ਜਾਣ ਤੋਂ ਬਚਣਾ ਚਾਹੀਦਾ ਹੈ।`,
  };

  if (c.waveHeightM != null && c.waveHeightM >= 2.5) {
    const hStr = c.waveHeightM.toFixed(1);
    out.push({
      id: "wave-high",
      level: c.waveHeightM >= 3.5 ? "danger" : "warning",
      title: waveTitles[lang] ?? waveTitles.en,
      body: (waveBodies[lang] ?? waveBodies.en)(hStr),
      issuedAt: at,
      official: false,
      source: "Open-Meteo Marine (observed/forecast)",
    });
  }

  const windTitles: Record<LangCode, string> = {
    en: "Strong winds",
    hi: "तेज़ हवाएँ",
    gu: "તીવ્ર પવન",
    mr: "जोरदार वारे",
    ta: "பலத்த காற்று",
    te: "బలమైన గాలులు",
    ml: "ശക്തമായ കാറ്റ്",
    bn: "প্রবল বাতাস",
    kn: "ಬಲವಾದ ಗಾಳಿ",
    or: "ପ୍ରବଳ ପବନ",
    pa: "ਤੇਜ਼ ਹਵਾਵਾਂ",
  };

  const windBodies: Record<LangCode, (w: number) => string> = {
    en: (w) => `Wind speed is ${w} km/h. Handling and return to shore may become difficult.`,
    hi: (w) => `हवा की गति ${w} किमी/घंटा है। नाव संचालन और तट पर लौटना कठिन हो सकता है।`,
    gu: (w) => `પવનની ઝડપ ${w} કિમી/કલાક છે. બોટનું સંચાલન અને કાંઠે પાછા ફરવું મુશ્કેલ બની શકે છે.`,
    mr: (w) => `वाऱ्याचा वेग ${w} किमी/तास आहे. बोट नियंत्रण आणि किनाऱ्यावर परतणे कठीण होऊ शकते.`,
    ta: (w) => `காற்றின் வேகம் ${w} கிமீ/மணி. படகு கையாளுதல் மற்றும் கரைக்கு திரும்புவது கடினமாகலாம்.`,
    te: (w) => `గాలి వేగం ${w} కిమీ/గం. పడవ నియంత్రణ మరియు ఒడ్డుకు తిరిగి రావడం కష్టతరం కావచ్చు.`,
    ml: (w) => `കാറ്റിന്റെ വേഗത ${w} കി.മീ/മണിക്കൂർ ആണ്. വള്ളം നിയന്ത്രിക്കുന്നതും തീരത്തേക്ക് മടങ്ങുന്നതും ബുദ്ധിമുട്ടായേക്കാം.`,
    bn: (w) => `বাতাসের গতিবেগ ${w} কিমি/ঘণ্টা। নৌকা নিয়ন্ত্রণ ও তীরে ফেরা কঠিন হতে পারে।`,
    kn: (w) => `ಗಾಳಿಯ ವೇಗ ${w} ಕಿಮೀ/ಗಂ ಆಗಿದೆ. ದೋಣಿ ನಿಯಂತ್ರಣ ಮತ್ತು ದಡಕ್ಕೆ ಮರಳುವುದು ಕಷ್ಟಕರವಾಗಬಹುದು.`,
    or: (w) => `ପବନର ଗତି ${w} କିମି/ଘଣ୍ଟା। ଡଙ୍ଗା ନିୟନ୍ତ୍ରଣ ଏବଂ କୂଳକୁ ଫେରିବା କଷ୍ଟକର ହୋଇପାରେ।`,
    pa: (w) => `ਹਵਾ ਦੀ ਗਤੀ ${w} ਕਿਲੋਮੀਟਰ/ਘੰਟਾ ਹੈ। ਕਿਸ਼ਤੀ ਸੰਭਾਲਣਾ ਅਤੇ ਤੱਟ 'ਤੇ ਵਾਪਸ ਆਉਣਾ ਔਖਾ ਹੋ ਸਕਦਾ ਹੈ।`,
  };

  if (c.windSpeedKmh != null && c.windSpeedKmh >= 35) {
    const wVal = Math.round(c.windSpeedKmh);
    out.push({
      id: "wind-strong",
      level: c.windSpeedKmh >= 50 ? "danger" : "warning",
      title: windTitles[lang] ?? windTitles.en,
      body: (windBodies[lang] ?? windBodies.en)(wVal),
      issuedAt: at,
      official: false,
      source: "Open-Meteo Weather (observed/forecast)",
    });
  }

  const visTitles: Record<LangCode, string> = {
    en: "Low visibility",
    hi: "कम दृश्यता",
    gu: "ઓછી દૃશ્યતા",
    mr: "कमी दृश्यमानता",
    ta: "குறைந்த பார்வை திறன்",
    te: "తక్కువ దృశ్యమానత",
    ml: "കുറഞ്ഞ കാഴ്ച പരിധി",
    bn: "কম দৃশ্যমানতা",
    kn: "ಕಡಿಮೆ ಗೋಚರತೆ",
    or: "କମ ଦୃଶ୍ୟମାନତା",
    pa: "ਘੱਟ ਦਿੱਖ",
  };

  const visBodies: Record<LangCode, (v: number) => string> = {
    en: (v) => `Visibility is about ${v} km. Navigation and collision risk increases sharply.`,
    hi: (v) => `दृश्यता लगभग ${v} किमी है। नेविगेशन और टकराव का जोखिम काफी बढ़ जाता है।`,
    gu: (v) => `દૃશ્યતા આશરે ${v} કિમી છે. નેવિગેશન અને અથડામણનું જોખમ વધી જાય છે.`,
    mr: (v) => `दृश्यमानता सुमारे ${v} किमी आहे. दिशा शोधणे आणि अपघाताचा धोका वाढतो.`,
    ta: (v) => `பார்வைத்திறன் சுமார் ${v} கிமீ. வழிசெலுத்தல் மற்றும் விபத்து ஆபத்து அதிகமாகும்.`,
    te: (v) => `దృశ్యమానత దాదాపు ${v} కిమీ. నావిగేషన్ మరియు ఢీకొనే ప్రమాదం పెరుగుతుంది.`,
    ml: (v) => `കാഴ്ച പരിധി ഏകദേശം ${v} കി.മീ ആണ്. സഞ്ചാരവും അപകട സാധ്യതയും വർദ്ധിക്കുന്നു.`,
    bn: (v) => `দৃশ্যমানতা প্রায় ${v} কিমি। দিকনির্ণয় এবং সংঘর্ষের ঝুঁকি উল্লেখযোগ্যভাবে বাড়ে।`,
    kn: (v) => `ಗೋಚರತೆ ಸುಮಾರು ${v} ಕಿಮೀ ಆಗಿದೆ. ದಾರಿ ಹುಡುಕುವುದು ಮತ್ತು ಡಿಕ್ಕಿಯ ಅಪಾಯ ಹೆಚ್ಚಾಗುತ್ತದೆ.` ,
    or: (v) => `ଦୃଶ୍ୟମାନତା ପ୍ରାୟ ${v} କିମି। ନାଭିଗେସନ୍ ଏବଂ ଦୁର୍ଘଟଣା ଆଶଙ୍କା ବୃଦ୍ଧି ପାଏ।`,
    pa: (v) => `ਦਿੱਖ ਲਗਭਗ ${v} ਕਿਲੋਮੀਟਰ ਹੈ। ਰਸਤਾ ਲੱਭਣ ਅਤੇ ਟਕਰਾਉਣ ਦਾ ਖਤਰਾ ਵਧ ਜਾਂਦਾ ਹੈ।`,
  };

  if (c.visibilityKm != null && c.visibilityKm < 2) {
    out.push({
      id: "visibility-low",
      level: "warning",
      title: visTitles[lang] ?? visTitles.en,
      body: (visBodies[lang] ?? visBodies.en)(c.visibilityKm),
      issuedAt: at,
      official: false,
      source: "Open-Meteo Weather (observed/forecast)",
    });
  }

  const worsening = bundle.forecast.find((p) => p.level === "dangerous" || p.level === "emergency");
  if (worsening) {
    const worsensTitles: Record<LangCode, string> = {
      en: "Conditions expected to worsen",
      hi: "स्थितियाँ बिगड़ने की संभावना",
      gu: "સ્થિતિ બગડવાની શક્યતા",
      mr: "परिस्थिती बिघडण्याची शक्यता",
      ta: "நிலைமை மோசமடைய வாய்ப்பு",
      te: "పరిస్థితులు మరింత దిగజారే అవకాశం",
      ml: "കാലാവസ്ഥ മോശമാകാൻ സാധ്യത",
      bn: "পরিস্থিতি অবনতি হওয়ার আশঙ্কা",
      kn: "ಪರಿಸ್ಥಿತಿ ಹದಗೆಡುವ ನಿರೀಕ್ಷೆ",
      or: "ସ୍ଥିତି ଖରାପ ହେବାର ସମ୍ଭାବନା",
      pa: "ਸਥਿਤੀ ਖਰਾਬ ਹੋਣ ਦੀ ਸੰਭਾਵਨਾ",
    };

    const worsensBodies: Record<LangCode, (timeStr: string) => string> = {
      en: (t) => `Forecast conditions become unsafe around ${t}. Plan your return before then.`,
      hi: (t) => `पूर्वानુમાન के अनुसार स्थितियाँ लगभग ${t} असुरक्षित हो जाएँगी। उससे पहले वापसी की योजना बनाएँ।`,
      gu: (t) => `આગાહી મુજબ આશરે ${t} વાગ્યે સ્થિતિ અસુરક્ષિત બનશે. તે પહેલાં પરત ફરવાનું આયોજન કરો.`,
      mr: (t) => `अंदाजानुसार परिस्थिती सुमारे ${t} वाजता असुरक्षित होईल. त्यापूर्वी परत येण्याचे नियोजन करा.`,
      ta: (t) => `வானிலை முன்னறிவிப்பின்படி நிலைமை ${t} மணியளவில் பாதுகாப்பற்றதாக மாறும். அதற்கு முன் திரும்ப திட்டமிடுங்கள்.`,
      te: (t) => `వాతావరణ సూచన ప్రకారం పరిస్థితులు సుమారు ${t} సమయంలో ప్రమాదకరంగా మారవచ్చు. ఆలోపే తిరిగి రావాలని ప్లాన్ చేసుకోండి.`,
      ml: (t) => `കാലാവസ്ഥ പ്രവചനമനുസരിച്ച് ${t} സമയത്ത് അവസ്ഥ സുരക്ഷിതമല്ലാതാകും. അതിനുമുമ്പ് മടങ്ങാൻ ആസൂത്രണം ചെയ്യുക.`,
      bn: (t) => `পূর্বাভাস অনুযায়ী প্রায় ${t} নাগাদ পরিস্থিতি অনিরাপদ হয়ে উঠবে। তার আগেই ফিরে আসার পরিকল্পনা করুন।`,
      kn: (t) => `ಮುನ್ಸೂಚನೆಯಂತೆ ಸುಮಾರು ${t} ಸಮಯದಲ್ಲಿ ಪರಿಸ್ಥಿತಿ ಅಸುರಕ್ಷಿತವಾಗಬಹುದು. ಅದಕ್ಕೂ ಮೊದಲೇ ಮರಳಲು ಯೋಜಿಸಿ.`,
      or: (t) => `ପୂର୍ବାନୁମାନ ଅନୁଯାୟୀ ପ୍ରାୟ ${t} ସମୟରେ ପରିସ୍ଥିତି ଅସୁରକ୍ଷିତ ହୋଇଯିବ। ତା' ପୂର୍ବରୁ ଫେରିବାକୁ ଯୋଜନା କରନ୍ତୁ।`,
      pa: (t) => `ਭਵਿੱਖਬਾਣੀ ਅਨੁਸਾਰ ਲਗਭਗ ${t} ਵਜੇ ਸਥਿਤੀ ਅਸੁਰੱਖਿਅਤ ਹੋ ਜਾਵੇਗੀ। ਉਸ ਤੋਂ ਪਹਿਲਾਂ ਵਾਪਸ ਆਉਣ ਦੀ ਯੋਜਨਾ ਬਣਾਓ।`,
    };

    const timeFormatted = new Date(worsening.time).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    out.push({
      id: "forecast-deterioration",
      level: "warning",
      title: worsensTitles[lang] ?? worsensTitles.en,
      body: (worsensBodies[lang] ?? worsensBodies.en)(timeFormatted),
      issuedAt: at,
      official: false,
      source: "Open-Meteo forecast",
    });
  }

  return out;
}
