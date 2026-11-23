import type { LangCode } from "./i18n";

export interface ChatUICopy {
  welcome: string;
  history: string;
  search: string;
  empty: string;
  attachments: string;
  soon: string;
  review: string;
  copyFailed: string;
}

export const chatCopy: Record<LangCode, ChatUICopy> = {
  en: {
    welcome: "How can I help at sea today?",
    history: "Your conversations",
    search: "Search conversations",
    empty: "No conversations yet",
    attachments: "Attachments",
    soon: "Images and documents — coming soon",
    review: "Review the question, then send",
    copyFailed: "Could not copy this response",
  },
  hi: {
    welcome: "आज समुद्र के बारे में क्या जानना है?",
    history: "आपकी बातचीत",
    search: "बातचीत खोजें",
    empty: "अभी कोई बातचीत नहीं",
    attachments: "अटैचमेंट",
    soon: "चित्र और दस्तावेज़ — जल्द आ रहा है",
    review: "प्रश्न जाँचें और भेजें",
    copyFailed: "कॉपी नहीं हो सका",
  },
  gu: {
    welcome: "દરિયામાં આજે શું જાણવું છે?",
    history: "તમારી વાતચીત",
    search: "વાતચીત શોધો",
    empty: "હજી કોઈ વાતચીત નથી",
    attachments: "જોડાણો",
    soon: "ઇમેજ અને દસ્તાવેજ — ટૂંક સમયમાં",
    review: "પ્રશ્ન તપાસો અને મોકલો",
    copyFailed: "કૉપિ થઈ શક્યું નથી",
  },
  mr: {
    welcome: "आज समुद्राबद्दल काय जाणून घ्यायचे आहे?",
    history: "तुमची संभाषणे",
    search: "संभाषणे शोधा",
    empty: "अद्याप कोणतेही संभाषण नाही",
    attachments: "संलग्नके",
    soon: "चित्रे आणि कागदपत्रे — लवकरच येत आहे",
    review: "प्रश्न तपासा आणि पाठवा",
    copyFailed: "उत्तर कॉपी करता आले नाही",
  },
  ta: {
    welcome: "இன்று கடல் குறித்து என்ன உதவலாம்?",
    history: "உங்கள் உரையாடல்கள்",
    search: "உரையாடல்களைத் தேடுங்கள்",
    empty: "இன்னும் உரையாடல்கள் இல்லை",
    attachments: "இணைப்புகள்",
    soon: "படங்கள் மற்றும் ஆவணங்கள் — விரைவில்",
    review: "கேள்வியைச் சரிபார்த்து அனுப்பவும்",
    copyFailed: "பதிலை நகலெடுக்க முடியவில்லை",
  },
  te: {
    welcome: "ఈరోజు సముద్రం గురించి ఏమి తెలుసుకోవాలి?",
    history: "మీ సంభాషణలు",
    search: "సంభాషణలను వెతకండి",
    empty: "ఇంకా సంభాషణలు లేవు",
    attachments: "జోడింపులు",
    soon: "చిత్రాలు మరియు పత్రాలు — త్వరలో వస్తున్నాయి",
    review: "ప్రశ్నను సరిచూసి పంపండి",
    copyFailed: "సమాధానాన్ని కాపీ చేయలేకపోయింది",
  },
  ml: {
    welcome: "ഇന്ന് കടലിനെക്കുറിച്ച് എന്താണ് അറിയേണ്ടത്?",
    history: "നിങ്ങളുടെ സംഭാഷണങ്ങൾ",
    search: "സംഭാഷണങ്ങൾ തിരയുക",
    empty: "ഇതുവരെ സംഭാഷണങ്ങളൊന്നുമില്ല",
    attachments: "അറ്റാച്ച്‌മെന്റുകൾ",
    soon: "ചിത്രങ്ങളും രേഖകളും — ഉടൻ വരുന്നു",
    review: "ചോദ്യം പരിശോധിച്ച് അയയ്ക്കുക",
    copyFailed: "മറുപടി പകർത്താനായില്ല",
  },
  bn: {
    welcome: "আজ সমুদ্র সম্পর্কে কীভাবে সাহায্য করতে পারি?",
    history: "আপনার কথোপকথন",
    search: "কথোপকথন খুঁজুন",
    empty: "এখনো কোনো কথোপকথন নেই",
    attachments: "সংযুক্তি",
    soon: "ছবি ও নথি — শীঘ্রই আসছে",
    review: "প্রশ্নটি যাচাই করে পাঠান",
    copyFailed: "উত্তরটি কপি করা যায়নি",
  },
  kn: {
    welcome: "ಇಂದು ಸಮುದ್ರದ ಬಗ್ಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    history: "ನಿಮ್ಮ ಸಂಭಾಷಣೆಗಳು",
    search: "ಸಂಭಾಷಣೆಗಳನ್ನು ಹುಡುಕಿ",
    empty: "ಇನ್ನೂ ಯಾವುದೇ ಸಂಭಾಷಣೆಗಳಿಲ್ಲ",
    attachments: "ಲಗತ್ತುಗಳು",
    soon: "ಚಿತ್ರಗಳು ಮತ್ತು ದಾಖಲೆಗಳು — ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ",
    review: "ಪ್ರಶ್ನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ ಕಳುಹಿಸಿ",
    copyFailed: "ಉತ್ತರವನ್ನು ನಕಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
  },
  or: {
    welcome: "ଆଜି ସମୁଦ୍ର ବିଷୟରେ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
    history: "ଆପଣଙ୍କ କଥାବାର୍ତ୍ତା",
    search: "କଥାବାର୍ତ୍ତା ଖୋଜନ୍ତୁ",
    empty: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି କଥାବାର୍ତ୍ତା ନାହିଁ",
    attachments: "ସଂଲଗ୍ନକ",
    soon: "ଛବି ଓ ଦଲିଲ୍ — ଶୀଘ୍ର ଆସୁଛି",
    review: "ପ୍ରଶ୍ନ ଯାଞ୍ଚ କରି ପଠାନ୍ତୁ",
    copyFailed: "ଉତ୍ତର କପି ହୋଇପାରିଲା ନାହିଁ",
  },
  pa: {
    welcome: "ਅੱਜ ਸਮੁੰਦਰ ਬਾਰੇ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    history: "ਤੁਹਾਡੀਆਂ ਗੱਲਬਾਤਾਂ",
    search: "ਗੱਲਬਾਤ ਖੋਜੋ",
    empty: "ਹਜੇ ਕੋਈ ਗੱਲਬਾਤ ਨਹੀਂ",
    attachments: "ਅਟੈਚਮੈਂਟ",
    soon: "ਤਸਵੀਰਾਂ ਅਤੇ ਦਸਤਾਵੇਜ਼ — ਜਲਦੀ ਆ ਰਹੇ ਹਨ",
    review: "ਸਵਾਲ ਦੀ ਜਾਂਚ ਕਰਕੇ ਭੇਜੋ",
    copyFailed: "ਜਵਾਬ ਕਾਪੀ ਨਹੀਂ ਹੋ ਸਕਿਆ",
  },
};

export interface LandingCopy {
  eyebrow: string;
  title: string;
  description: string;
  explore: string;
  heading: string;
  note: string;
  closing: string;
}

export const landingCopy: Record<LangCode, LandingCopy> = {
  en: {
    eyebrow: "MARINE INTELLIGENCE FOR COASTAL LIFE",
    title: "A clearer view\nof the sea.",
    description:
      "Understand sea conditions, explore the coast, and ask in your own language. Available evidence stays connected to every marine answer.",
    explore: "Explore the platform",
    heading: "One conversation. A clearer picture.",
    note: "Available readings, their sources, and their limits. In one place.",
    closing: "Your next journey starts with a question.",
  },
  hi: {
    eyebrow: "तटीय जीवन के लिए समुद्री जानकारी",
    title: "समुद्र को समझने का\nएक नया नज़रिया।",
    description:
      "समुद्र की स्थिति समझें, नक्शे पर देखें और अपनी भाषा में पूछें। उपलब्ध जानकारी के स्रोत हर सलाह के साथ।",
    explore: "प्लेटफ़ॉर्म देखें",
    heading: "एक बातचीत। अधिक स्पष्टता।",
    note: "उपलब्ध जानकारी, उसके समय और सीमाओं के साथ।",
    closing: "आपकी अगली यात्रा यहाँ से शुरू होती है।",
  },
  gu: {
    eyebrow: "દરિયાકાંઠા માટે બુદ્ધિમત્તા",
    title: "દરિયો સમજવા માટે\nએક નવી દિશા.",
    description:
      "દરિયાની સ્થિતિ સમજો, નકશા પર તપાસો અને તમારી ભાષામાં પૂછો. દરેક સલાહ સાથે ઉપલબ્ધ માહિતીના સ્ત્રોત.",
    explore: "પ્લેટફોર્મ જુઓ",
    heading: "એક વાતચીત. વધુ સ્પષ્ટતા.",
    note: "ઉપલબ્ધ માહિતી, તેના સમય અને મર્યાદાઓ સાથે.",
    closing: "તમારી આગલી સફર અહીંથી શરૂ થાય છે.",
  },
  mr: {
    eyebrow: "किनारी जीवनासाठी सागरी माहिती",
    title: "समुद्र समजून घेण्याची\nअधिक स्पष्ट दिशा.",
    description:
      "समुद्राची स्थिती जाणून घ्या, किनारा नकाशावर पाहा आणि तुमच्या भाषेत विचारा. प्रत्येक उत्तरासोबत उपलब्ध स्रोतांचा पुरावा.",
    explore: "प्लॅटफॉर्म पहा",
    heading: "एक संभाषण. अधिक स्पष्ट चित्र.",
    note: "उपलब्ध मोजमाप, त्यांचे स्रोत आणि मर्यादा एकाच ठिकाणी.",
    closing: "तुमचा पुढचा प्रवास एका प्रश्नाने सुरू होतो.",
  },
  ta: {
    eyebrow: "கடலோர வாழ்விற்கான கடல் நுண்ணறிவு",
    title: "கடலைப் பற்றிய\nதெளிவான பார்வை.",
    description:
      "கடல் நிலையை அறிந்து கொள்ளுங்கள், வரைபடத்தில் பாருங்கள், உங்கள் மொழியில் கேளுங்கள். ஒவ்வொரு பதிலுடனும் ஆதாரத் தகவல்.",
    explore: "தளத்தை ஆராய்க",
    heading: "ஒரு உரையாடல். தெளிவான படம்.",
    note: "கிடைக்கும் அளவீடுகள், ஆதாரங்கள் மற்றும் வரம்புகள் ஒரே இடத்தில்.",
    closing: "உங்கள் அடுத்த பயணம் ஒரு கேள்வியுடன் தொடங்குகிறது.",
  },
  te: {
    eyebrow: "తీరప్రాంత జీవనానికి సముద్ర సమాచారం",
    title: "సముద్రాన్ని అర్థం చేసుకునే\nమరింత స్పష్టమైన దృష్టి.",
    description:
      "సముద్ర పరిస్థితులను తెలుసుకోండి, మ్యాప్‌లో చూడండి, మీ భాషలోనే అడగండి. ప్రతి సమాధానంతో అందుబాటులో ఉన్న ఆధారాలు.",
    explore: "ప్లాట్‌ఫారమ్ చూడండి",
    heading: "ఒక సంభాషణ. మరింత స్పష్టత.",
    note: "అందుబాటులో ఉన్న రీడింగ్స్, మూలాలు మరియు పరిమితులు ఒకే చోట.",
    closing: "మీ తదుపరి ప్రయాణం ఒక ప్రశ్నతో ప్రారంభమవుతుంది.",
  },
  ml: {
    eyebrow: "തീരദേശ ജീവിതത്തിനുള്ള സമുദ്ര വിവരങ്ങൾ",
    title: "കടലിനെ അറിയാൻ\nകൂടുതൽ വ്യക്തമായ കാഴ്ച.",
    description:
      "കടൽ സാഹചര്യങ്ങൾ മനസ്സിലാക്കുക, മാപ്പിൽ കാണുക, നിങ്ങളുടെ ഭാഷയിൽ ചോദിക്കുക. ഓരോ മറുപടിയോടും ലഭ്യമായ ഉറവിടങ്ങൾ.",
    explore: "പ്ലാറ്റ്‌ഫോം കാണുക",
    heading: "ഒരു സംഭാഷണം. വ്യക്തമായ ചിത്രം.",
    note: "ലഭ്യമായ വിവരങ്ങളും ഉറവിടങ്ങളും പരിധികളും ഒരിടത്ത്.",
    closing: "നിങ്ങളുടെ അടുത്ത യാത്ര ഒരു ചോദ്യത്തിൽ തുടങ്ങുന്നു.",
  },
  bn: {
    eyebrow: "উপকূলীয় জীবনের জন্য সামুদ্রিক তথ্য",
    title: "সমুদ্রকে জানার\nআরও স্পষ্ট দৃষ্টি।",
    description:
      "সমুদ্রের অবস্থা বুঝুন, মানচিত্রে দেখুন এবং নিজের ভাষায় জিজ্ঞাসা করুন। প্রতিটি উত্তরের সাথে উপলব্ধ তথ্যের উৎস।",
    explore: "প্ল্যাটফর্ম দেখুন",
    heading: "একটি কথোপকথন। আরও স্পষ্ট চিত্র।",
    note: "উপলব্ধ তথ্য, তার উৎস ও সীমাবদ্ধতা এক জায়গায়।",
    closing: "আপনার পরবর্তী যাত্রা শুরু হয় একটি প্রশ্ন দিয়ে।",
  },
  kn: {
    eyebrow: "ಕರಾವಳಿ ಬದುಕಿಗಾಗಿ ಸಮುದ್ರ ಮಾಹಿತಿ",
    title: "ಸಮುದ್ರವನ್ನು ಅರಿಯಲು\nಹೆಚ್ಚು ಸ್ಪಷ್ಟ ನೋಟ.",
    description:
      "ಸಮುದ್ರದ ಸ್ಥಿತಿಯನ್ನು ತಿಳಿಯಿರಿ, ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ ಮತ್ತು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ. ಪ್ರತಿ ಉತ್ತರದೊಂದಿಗೆ ಲಭ್ಯವಿರುವ ಆಧಾರಗಳು.",
    explore: "ವೇದಿಕೆ ನೋಡಿ",
    heading: "ಒಂದು ಸಂಭಾಷಣೆ. ಸ್ಪಷ್ಟ ಚಿತ್ರಣ.",
    note: "ಲಭ್ಯವಿರುವ ಮಾಪನಗಳು, ಮೂಲಗಳು ಮತ್ತು ಮಿತಿಗಳು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.",
    closing: "ನಿಮ್ಮ ಮುಂದಿನ ಪಯಣ ಒಂದು ಪ್ರಶ್ನೆಯಿಂದ ಆರಂಭವಾಗುತ್ತದೆ.",
  },
  or: {
    eyebrow: "ଉପକୂଳ ଜୀବନ ପାଇଁ ସମୁଦ୍ର ସୂଚନା",
    title: "ସମୁଦ୍ରକୁ ବୁଝିବାର\nଅଧିକ ସ୍ପଷ୍ଟ ଦୃଷ୍ଟି।",
    description:
      "ସମୁଦ୍ର ଅବସ୍ଥା ଜାଣନ୍ତୁ, ମାନଚିତ୍ରରେ ଦେଖନ୍ତୁ ଓ ନିଜ ଭାଷାରେ ପଚାରନ୍ତୁ। ପ୍ରତି ଉତ୍ତର ସହିତ ଉପଲବ୍ଧ ସୂଚନାର ଉତ୍ସ।",
    explore: "ପ୍ଲାଟଫର୍ମ ଦେଖନ୍ତୁ",
    heading: "ଗୋଟିଏ କଥାବାର୍ତ୍ତା। ଅଧିକ ସ୍ପଷ୍ଟତା।",
    note: "ଉପଲବ୍ଧ ତଥ୍ୟ, ଉତ୍ସ ଓ ସୀମା ଗୋଟିଏ ସ୍ଥାନରେ।",
    closing: "ଆପଣଙ୍କ ପରବର୍ତ୍ତୀ ଯାତ୍ରା ଗୋଟିଏ ପ୍ରଶ୍ନରୁ ଆରମ୍ଭ ହୁଏ।",
  },
  pa: {
    eyebrow: "ਤੱਟੀ ਜੀਵਨ ਲਈ ਸਮੁੰਦਰੀ ਜਾਣਕਾਰੀ",
    title: "ਸਮੁੰਦਰ ਨੂੰ ਸਮਝਣ ਦਾ\nਵਧੇਰੇ ਸਪੱਸ਼ਟ ਨਜ਼ਰੀਆ।",
    description:
      "ਸਮੁੰਦਰ ਦੀ ਸਥਿਤੀ ਸਮਝੋ, ਨਕਸ਼ੇ ਤੇ ਵੇਖੋ ਅਤੇ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਪੁੱਛੋ। ਹਰ ਜਵਾਬ ਨਾਲ ਉਪਲਬਧ ਸਰੋਤ ਜੁੜੇ ਰਹਿੰਦੇ ਹਨ।",
    explore: "ਪਲੇਟਫਾਰਮ ਵੇਖੋ",
    heading: "ਇੱਕ ਗੱਲਬਾਤ। ਵਧੇਰੇ ਸਪੱਸ਼ਟਤਾ।",
    note: "ਉਪਲਬਧ ਜਾਣਕਾਰੀ, ਸਰੋਤ ਅਤੇ ਸੀਮਾਵਾਂ ਇੱਕ ਥਾਂ ਤੇ।",
    closing: "ਤੁਹਾਡਾ ਅਗਲਾ ਸਫ਼ਰ ਇੱਕ ਸਵਾਲ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ।",
  },
};

export const authOceanCopy: Record<LangCode, { eyebrow: string; headline: string }> = {
  en: { eyebrow: "OCEAN INTELLIGENCE, WITH CONTEXT", headline: "Know the sea.\nPlan with clarity." },
  hi: { eyebrow: "संदर्भ सहित समुद्री जानकारी", headline: "समुद्र को समझें।\nसोचकर आगे बढ़ें।" },
  gu: { eyebrow: "સંદર્ભ સાથે દરિયાઈ માહિતી", headline: "દરિયો સમજો.\nવિચારીને આગળ વધો." },
  mr: { eyebrow: "संदर्भासह सागरी माहिती", headline: "समुद्र जाणून घ्या.\nस्पष्ट नियोजन करा." },
  ta: { eyebrow: "சூழலுடன் கூடிய கடல் நுண்ணறிவு", headline: "கடலை அறிந்துகொள்ளுங்கள்.\nதெளிவாகத் திட்டமிடுங்கள்." },
  te: { eyebrow: "సందర్భంతో కూడిన సముద్ర సమాచారం", headline: "సముద్రాన్ని తెలుసుకోండి.\nస్పష్టంగా ప్రణాళిక వేయండి." },
  ml: { eyebrow: "സന്ദർഭസഹിത സമുദ്ര വിവരങ്ങൾ", headline: "കടലിനെ അറിയുക.\nവ്യക്തതയോടെ ആസൂത്രണം ചെയ്യുക." },
  bn: { eyebrow: "প্রেক্ষাপটসহ সামুদ্রিক তথ্য", headline: "সমুদ্রকে জানুন।\nস্পষ্ট পরিকল্পনা করুন।" },
  kn: { eyebrow: "ಸಂದರ್ಭಸಹಿತ ಸಮುದ್ರ ಮಾಹಿತಿ", headline: "ಸಮುದ್ರವನ್ನು ತಿಳಿಯಿರಿ.\nಸ್ಪಷ್ಟವಾಗಿ ಯೋಜಿಸಿ." },
  or: { eyebrow: "ସନ୍ଦର୍ଭ ସହିତ ସମୁଦ୍ର ସୂଚନା", headline: "ସମୁଦ୍ରକୁ ଜାଣନ୍ତୁ।\nସ୍ପଷ୍ଟ ଯୋଜନା କରନ୍ତୁ।" },
  pa: { eyebrow: "ਸੰਦਰਭ ਸਮੇਤ ਸਮੁੰਦਰੀ ਜਾਣਕਾਰੀ", headline: "ਸਮੁੰਦਰ ਨੂੰ ਜਾਣੋ।\nਸਪੱਸ਼ਟ ਯੋਜਨਾ ਬਣਾਓ।" },
};

export interface VoiceUICopy {
  conversation: string;
  listening: string;
  processing: string;
  ready: string;
  end: string;
  failed: string;
}

export const voiceCopy: Record<LangCode, VoiceUICopy> = {
  en: {
    conversation: "Voice conversation",
    listening: "Listening",
    processing: "Transcribing",
    ready: "Transcript ready — edit it below, then send.",
    end: "End conversation",
    failed: "Voice is unavailable. Try again or type your question.",
  },
  hi: {
    conversation: "आवाज़ में बातचीत",
    listening: "सुन रहा है",
    processing: "लिखित रूप में बदल रहा है",
    ready: "लिखित रूप तैयार — संपादित करके भेजें।",
    end: "बातचीत समाप्त करें",
    failed: "आवाज़ सेवा उपलब्ध नहीं है। फिर कोशिश करें या प्रश्न लिखें।",
  },
  gu: {
    conversation: "અવાજમાં વાતચીત",
    listening: "સાંભળી રહ્યું છે",
    processing: "લખાણમાં ફેરવી રહ્યું છે",
    ready: "લખાણ તૈયાર — સુધારો અને મોકલો.",
    end: "વાતચીત બંધ કરો",
    failed: "અવાજ સેવા ઉપલબ્ધ નથી. ફરી પ્રયાસ કરો અથવા પ્રશ્ન લખો.",
  },
  mr: {
    conversation: "आवाजात संभाषण",
    listening: "ऐकत आहे",
    processing: "मजकुरात रूपांतरित करत आहे",
    ready: "मजकूर तयार — खाली तपासून पाठवा.",
    end: "संभाषण समाप्त करा",
    failed: "आवाज सेवा उपलब्ध नाही. पुन्हा प्रयत्न करा किंवा प्रश्न टाइप करा.",
  },
  ta: {
    conversation: "குரல் உரையாடல்",
    listening: "கேட்கிறது",
    processing: "எழுத்தாக மாற்றுகிறது",
    ready: "உரை தயார் — கீழே திருத்தி அனுப்பவும்.",
    end: "உரையாடலை முடிக்கவும்",
    failed: "குரல் சேவை கிடைக்கவில்லை. மீண்டும் முயலவும் அல்லது தட்டச்சு செய்யவும்.",
  },
  te: {
    conversation: "వాయిస్ సంభాషణ",
    listening: "వింటోంది",
    processing: "టెక్స్ట్‌గా మారుస్తోంది",
    ready: "టెక్స్ట్ సిద్ధమైంది — క్రింద సరిచూసి పంపండి.",
    end: "సంభాషణ ముగించు",
    failed: "వాయిస్ సేవ అందుబాటులో లేదు. మళ్లీ ప్రయత్నించండి లేదా టైప్ చేయండి.",
  },
  ml: {
    conversation: "ശബ്ദ സംഭാഷണം",
    listening: "കേൾക്കുന്നു",
    processing: "എഴുത്താക്കി മാറ്റുന്നു",
    ready: "എഴുത്ത് തയ്യാർ — താഴെ തിരുത്തി അയയ്ക്കുക.",
    end: "സംഭാഷണം അവസാനിപ്പിക്കുക",
    failed: "ശബ്ദ സേവനം ലഭ്യമല്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.",
  },
  bn: {
    conversation: "ভয়েস কথোপকথন",
    listening: "শুনছে",
    processing: "লেখায় রূপান্তর হচ্ছে",
    ready: "লেখা প্রস্তুত — নিচে সম্পাদনা করে পাঠান।",
    end: "কথোপকথন শেষ করুন",
    failed: "ভয়েস পরিষেবা উপলব্ধ নয়। আবার চেষ্টা করুন বা প্রশ্ন লিখুন।",
  },
  kn: {
    conversation: "ಧ್ವನಿ ಸಂಭಾಷಣೆ",
    listening: "ಕೇಳುತ್ತಿದೆ",
    processing: "ಪಠ್ಯವಾಗಿ ಪರಿವರ್ತಿಸುತ್ತಿದೆ",
    ready: "ಪಠ್ಯ ಸಿದ್ಧವಾಗಿದೆ — ಕೆಳಗೆ ತಿದ್ದುಪಡಿ ಮಾಡಿ ಕಳುಹಿಸಿ.",
    end: "ಸಂಭಾಷಣೆ ಮುಗಿಸಿ",
    failed: "ಧ್ವನಿ ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ.",
  },
  or: {
    conversation: "ସ୍ୱର କଥାବାର୍ତ୍ତା",
    listening: "ଶୁଣୁଛି",
    processing: "ଲେଖାରେ ପରିଣତ କରୁଛି",
    ready: "ଲେଖା ପ୍ରସ୍ତୁତ — ତଳେ ସଂଶୋଧନ କରି ପଠାନ୍ତୁ।",
    end: "କଥାବାର୍ତ୍ତା ସମାପ୍ତ କରନ୍ତୁ",
    failed: "ସ୍ୱର ସେବା ଉପଲବ୍ଧ ନାହିଁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ପ୍ରଶ୍ନ ଟାଇପ୍ କରନ୍ତୁ।",
  },
  pa: {
    conversation: "ਆਵਾਜ਼ ਗੱਲਬਾਤ",
    listening: "ਸੁਣ ਰਿਹਾ ਹੈ",
    processing: "ਲਿਖਤ ਵਿੱਚ ਬਦਲ ਰਿਹਾ ਹੈ",
    ready: "ਲਿਖਤ ਤਿਆਰ — ਹੇਠਾਂ ਸੋਧ ਕੇ ਭੇਜੋ।",
    end: "ਗੱਲਬਾਤ ਬੰਦ ਕਰੋ",
    failed: "ਆਵਾਜ਼ ਸੇਵਾ ਉਪਲਬਧ ਨਹੀਂ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਸਵਾਲ ਲਿਖੋ।",
  },
};

export interface SafetyCopy {
  insufficientLive: string;
  safeAssessed: string;
  why: string;
}

export const safetyCopy: Record<LangCode, SafetyCopy> = {
  en: { insufficientLive: "Insufficient live data", safeAssessed: "SAFE · assessed dimensions", why: "Why?" },
  hi: { insufficientLive: "पर्याप्त लाइव डेटा नहीं", safeAssessed: "सुरक्षित · उपलब्ध माप के अनुसार", why: "क्यों?" },
  gu: { insufficientLive: "જીવંત માહિતી અપૂરતી છે", safeAssessed: "સલામત · ઉપલબ્ધ માપન મુજબ", why: "શા માટે?" },
  mr: { insufficientLive: "अपुरा थेट डेटा", safeAssessed: "सुरक्षित · उपलब्ध मोजमापानुसार", why: "का?" },
  ta: { insufficientLive: "நேரடி தரவு போதுமானதாக இல்லை", safeAssessed: "பாதுகாப்பானது · மதிப்பிடப்பட்ட அளவுகள்", why: "ஏன்?" },
  te: { insufficientLive: "తగినంత ప్రత్యక్ష డేటా లేదు", safeAssessed: "సురక్షితం · అంచనా వేసిన అంశాలు", why: "ఎందుకు?" },
  ml: { insufficientLive: "മതിയായ തത്സമയ ഡാറ്റയില്ല", safeAssessed: "സുരക്ഷിതം · വിലയിരുത്തിയ അളവുകൾ", why: "എന്തുകൊണ്ട്?" },
  bn: { insufficientLive: "পর্যাপ্ত লাইভ ডেটা নেই", safeAssessed: "নিরাপদ · মূল্যায়িত মাত্রা অনুযায়ী", why: "কেন?" },
  kn: { insufficientLive: "ಸಾಕಷ್ಟು ನೇರ ಡೇಟಾ ಇಲ್ಲ", safeAssessed: "ಸುರಕ್ಷಿತ · ಮೌಲ್ಯಮಾಪನ ಮಾಡಿದ ಅಂಶಗಳು", why: "ಏಕೆ?" },
  or: { insufficientLive: "ପର୍ଯ୍ୟାପ୍ତ ଲାଇଭ୍ ଡାଟା ନାହିଁ", safeAssessed: "ସୁରକ୍ଷିତ · ମୂଲ୍ୟାୟିତ ମାନ ଅନୁଯାୟୀ", why: "କାହିଁକି?" },
  pa: { insufficientLive: "ਲੋੜੀਂਦਾ ਲਾਈਵ ਡਾਟਾ ਨਹੀਂ", safeAssessed: "ਸੁਰੱਖਿਅਤ · ਮੁਲਾਂਕਣ ਕੀਤੇ ਮਾਪਾਂ ਅਨੁਸਾਰ", why: "ਕਿਉਂ?" },
};

export interface MapPanelUICopy {
  grid: string;
  details: string;
  reference: string;
  noTiles: string;
  advanced: string;
  recenter: string;
  guardOn: string;
  guardOff: string;
  connected: string;
  fullConnection: string;
  lowDataMode: string;
  offlineSaved: string;
  rangeRings: string;
  seamarks: string;
  vectors: string;
  speciesShort: string;
  rainfallShort: string;
  eezInside: string;
  eezOutside: string;
  fromPin: string;
  groupNav: string;
  fitLayers: string;
}

export const mapPanelCopy: Record<LangCode, MapPanelUICopy> = {
  en: {
    grid: "Model sample cells",
    details: "Location details",
    reference: "Satellite basemap · reference imagery, not live measurements",
    noTiles: "A lighter view. No map tiles are loaded.",
    advanced: "Advanced",
    recenter: "Recenter on selected location",
    guardOn: "Guard On",
    guardOff: "Guard Off",
    connected: "Connected",
    fullConnection: "Full connection",
    lowDataMode: "Low-data mode",
    offlineSaved: "Offline · saved information",
    rangeRings: "Range rings · 5/10/20 NM",
    seamarks: "Nautical seamarks · OpenSeaMap",
    vectors: "Direction samples",
    speciesShort: "Historical species",
    rainfallShort: "Rainfall cells · experimental",
    eezInside: "Inside EEZ",
    eezOutside: "Near / outside EEZ",
    fromPin: "From pin",
    groupNav: "Navigation & Zones",
    fitLayers: "Fit active layers",
  },
  hi: {
    grid: "मॉडल नमूना ग्रिड",
    details: "स्थान का विवरण",
    reference: "उपग्रह आधार मानचित्र · लाइव माप नहीं",
    noTiles: "कम डेटा के लिए पाठ दृश्य",
    advanced: "उन्नत",
    recenter: "चुना हुआ स्थान दिखाएँ",
    guardOn: "गार्ड चालू",
    guardOff: "गार्ड बंद",
    connected: "कनेक्टेड",
    fullConnection: "पूर्ण नेटवर्क",
    lowDataMode: "कम डेटा मोड",
    offlineSaved: "ऑफ़लाइन · सहेजी गई जानकारी",
    rangeRings: "दूरी वलय · 5/10/20 NM",
    seamarks: "समुद्री चिह्न · OpenSeaMap",
    vectors: "दिशा नमूने",
    speciesShort: "ऐतिहासिक प्रजातियाँ",
    rainfallShort: "वर्षा ग्रिड · प्रायोगिक",
    eezInside: "EEZ के भीतर",
    eezOutside: "EEZ के पास / बाहर",
    fromPin: "स्थान से",
    groupNav: "नेविगेशन और क्षेत्र",
    fitLayers: "सभी परतें दिखाएँ",
  },
  gu: {
    grid: "મોડેલ નમૂના ગ્રિડ",
    details: "સ્થાનની વિગતો",
    reference: "ઉપગ્રહ આધાર નકશો · જીવંત માપન નથી",
    noTiles: "ઓછા ડેટા માટે લખાણ દૃશ્ય",
    advanced: "અદ્યતન",
    recenter: "પસંદ કરેલું સ્થાન બતાવો",
    guardOn: "ગાર્ડ ચાલુ",
    guardOff: "ગાર્ડ બંધ",
    connected: "કનેક્ટેડ",
    fullConnection: "પૂર્ણ કનેક્શન",
    lowDataMode: "લો-ડેટા મોડ",
    offlineSaved: "ઓફલાઇન · સાચવેલી માહિતી",
    rangeRings: "અંતર વલય · 5/10/20 NM",
    seamarks: "દરિયાઈ ચિહ્નો · OpenSeaMap",
    vectors: "દિશા નમૂનાઓ",
    speciesShort: "ઐતિહાસિક પ્રજાતિઓ",
    rainfallShort: "વરસાદ ગ્રિડ · પ્રાયોગિક",
    eezInside: "EEZ અંદર",
    eezOutside: "EEZ નજીક / બહાર",
    fromPin: "પિનથી અંતર",
    groupNav: "નેવિગેશન અને વિસ્તારો",
    fitLayers: "બધા સ્તરો બતાવો",
  },
  mr: {
    grid: "मॉडेल नमुना ग्रिड",
    details: "स्थानाचा तपशील",
    reference: "उपग्रह आधार नकाशा · थेट मोजमाप नाही",
    noTiles: "कमी डेटासाठी मजकूर दृश्य",
    advanced: "प्रगत",
    recenter: "निवडलेले स्थान मध्यभागी आणा",
    guardOn: "गार्ड सुरू",
    guardOff: "गार्ड बंद",
    connected: "कनेक्टेड",
    fullConnection: "पूर्ण नेटवर्क",
    lowDataMode: "कमी डेटा मोड",
    offlineSaved: "ऑफलाइन · जतन माहिती",
    rangeRings: "अंतर वलये · 5/10/20 NM",
    seamarks: "सागरी चिन्हे · OpenSeaMap",
    vectors: "दिशा नमुने",
    speciesShort: "ऐतिहासिक प्रजाती",
    rainfallShort: "पाऊस ग्रिड · प्रायोगिक",
    eezInside: "EEZ आत",
    eezOutside: "EEZ जवळ / बाहेर",
    fromPin: "पिनपासून",
    groupNav: "नेव्हिगेशन आणि क्षेत्रे",
    fitLayers: "सर्व स्तर दाखवा",
  },
  ta: {
    grid: "மாதிரி கட்டங்கள்",
    details: "இட விவரங்கள்",
    reference: "செயற்கைக்கோள் அடிப்படை வரைபடம் · நேரடி அளவீடு அல்ல",
    noTiles: "குறைந்த தரவு உரைக் காட்சி",
    advanced: "மேம்பட்டது",
    recenter: "தேர்ந்தெடுத்த இடத்திற்குச் செல்க",
    guardOn: "காவல் இயக்கம்",
    guardOff: "காவல் நிறுத்தம்",
    connected: "இணைக்கப்பட்டது",
    fullConnection: "முழு இணைப்பு",
    lowDataMode: "குறைந்த தரவு முறை",
    offlineSaved: "ஆஃப்லைன் · சேமித்த தகவல்",
    rangeRings: "தூர வளையங்கள் · 5/10/20 NM",
    seamarks: "கடல் வழிகாட்டி · OpenSeaMap",
    vectors: "திசை மாதிரிகள்",
    speciesShort: "வரலாற்று இனங்கள்",
    rainfallShort: "மழை கட்டங்கள் · சோதனை",
    eezInside: "EEZ உள்ளே",
    eezOutside: "EEZ அருகே / வெளியே",
    fromPin: "இடத்திலிருந்து",
    groupNav: "வழிகாட்டி & மண்டலங்கள்",
    fitLayers: "அனைத்து அடுக்குகளும்",
  },
  te: {
    grid: "మోడల్ నమూనా గ్రిడ్",
    details: "స్థాన వివరాలు",
    reference: "శాటిలైట్ బేస్‌మ్యాప్ · ప్రత్యక్ష కొలతలు కావు",
    noTiles: "తక్కువ డేటా కోసం టెక్స్ట్ వీక్షణ",
    advanced: "అధునాతన",
    recenter: "ఎంచుకున్న స్థానాన్ని మధ్యకు తీసుకురండి",
    guardOn: "గార్డ్ ఆన్",
    guardOff: "గార్డ్ ఆఫ్",
    connected: "కనెక్ట్ అయింది",
    fullConnection: "పూర్తి కనెక్షన్",
    lowDataMode: "తక్కువ డేటా మోడ్",
    offlineSaved: "ఆఫ్‌లైన్ · సేవ్ చేసిన సమాచారం",
    rangeRings: "దూర వలయాలు · 5/10/20 NM",
    seamarks: "సముద్ర గుర్తులు · OpenSeaMap",
    vectors: "దిశ నమూనాలు",
    speciesShort: "చారిత్రక జాతులు",
    rainfallShort: "వర్షపు గ్రిడ్ · ప్రయోగాత్మకం",
    eezInside: "EEZ లోపల",
    eezOutside: "EEZ సమీపంలో / వెలుపల",
    fromPin: "పిన్ నుండి",
    groupNav: "నావిగేషన్ & మండలాలు",
    fitLayers: "అన్ని పొరలు చూపు",
  },
  ml: {
    grid: "മോഡൽ സാമ്പിൾ ഗ്രിഡ്",
    details: "സ്ഥല വിവരങ്ങൾ",
    reference: "സാറ്റലൈറ്റ് ബേസ്മാപ്പ് · തത്സമയ അളവുകളല്ല",
    noTiles: "കുറഞ്ഞ ഡാറ്റയ്ക്കായി ടെക്സ്റ്റ് കാഴ്ച",
    advanced: "വിപുലമായത്",
    recenter: "തിരഞ്ഞെടുത്ത സ്ഥലത്തേക്ക് മടങ്ങുക",
    guardOn: "ഗാർഡ് ഓൺ",
    guardOff: "ഗാർഡ് ഓഫ്",
    connected: "കണക്റ്റുചെയ്തു",
    fullConnection: "പൂർണ്ണ കണക്ഷൻ",
    lowDataMode: "ലോ-ഡാറ്റ മോഡ്",
    offlineSaved: "ഓഫ്‌ലൈൻ · സംരക്ഷിച്ച വിവരം",
    rangeRings: "ദൂര വളയങ്ങൾ · 5/10/20 NM",
    seamarks: "കടൽ അടയാളങ്ങൾ · OpenSeaMap",
    vectors: "ദിശാ സാമ്പിളുകൾ",
    speciesShort: "ചരിത്ര ജീവിവർഗ്ഗങ്ങൾ",
    rainfallShort: "മഴ ഗ്രിഡ് · പരീക്ഷണാത്മകം",
    eezInside: "EEZ ഉള്ളിൽ",
    eezOutside: "EEZ സമീപം / പുറത്ത്",
    fromPin: "പിന്നിൽ നിന്ന്",
    groupNav: "നാവിഗേഷൻ & മേഖലകൾ",
    fitLayers: "എല്ലാ ലെയറുകളും",
  },
  bn: {
    grid: "মডেল নমুনা গ্রিড",
    details: "স্থানের বিবরণ",
    reference: "স্যাটেলাইট বেসম্যাপ · সরাসরি পরিমাপ নয়",
    noTiles: "কম ডেটার জন্য টেক্সট ভিউ",
    advanced: "উন্নত",
    recenter: "নির্বাচিত স্থানে ফিরে যান",
    guardOn: "গার্ড চালু",
    guardOff: "গার্ড বন্ধ",
    connected: "সংযুক্ত",
    fullConnection: "পূর্ণ সংযোগ",
    lowDataMode: "লো-ডেটা মোড",
    offlineSaved: "অফলাইন · সংরক্ষিত তথ্য",
    rangeRings: "দূরত্ব বৃত্ত · 5/10/20 NM",
    seamarks: "সমুদ্র চিহ্ন · OpenSeaMap",
    vectors: "দিকনির্দেশ নমুনা",
    speciesShort: "ঐতিহাসিক প্রজাতি",
    rainfallShort: "বৃষ্টি গ্রিড · পরীক্ষামূলক",
    eezInside: "EEZ ভেতরে",
    eezOutside: "EEZ কাছে / বাইরে",
    fromPin: "পিন থেকে",
    groupNav: "নেভিগেশন ও অঞ্চল",
    fitLayers: "সব স্তর দেখান",
  },
  kn: {
    grid: "ಮಾದರಿ ನಮೂನಾ ಗ್ರಿಡ್",
    details: "ಸ್ಥಳದ ವಿವರಗಳು",
    reference: "ಉಪಗ್ರಹ ಮೂಲ ನಕ್ಷೆ · ನೇರ ಮಾಪನವಲ್ಲ",
    noTiles: "ಕಡಿಮೆ ಡೇಟಾಗೆ ಪಠ್ಯ ನೋಟ",
    advanced: "ಸುಧಾರಿತ",
    recenter: "ಆಯ್ದ ಸ್ಥಳವನ್ನು ಮಧ್ಯಕ್ಕೆ ತನ್ನಿ",
    guardOn: "ಗಾರ್ಡ್ ಆನ್",
    guardOff: "ಗಾರ್ಡ್ ಆಫ್",
    connected: "ಸಂಪರ್ಕಗೊಂಡಿದೆ",
    fullConnection: "ಪೂರ್ಣ ಸಂಪರ್ಕ",
    lowDataMode: "ಕಡಿಮೆ ಡೇಟಾ ಮೋಡ್",
    offlineSaved: "ಆಫ್‌ಲೈನ್ · ಉಳಿಸಿದ ಮಾಹಿತಿ",
    rangeRings: "ದೂರ ವಲಯಗಳು · 5/10/20 NM",
    seamarks: "ಸಮುದ್ರ ಚಿಹ್ನೆಗಳು · OpenSeaMap",
    vectors: "ದಿಕ್ಕಿನ ಮಾದರಿಗಳು",
    speciesShort: "ಐತಿಹಾಸಿಕ ಪ್ರಭೇದಗಳು",
    rainfallShort: "ಮಳೆ ಗ್ರಿಡ್ · ಪ್ರಾಯೋಗಿಕ",
    eezInside: "EEZ ಒಳಗೆ",
    eezOutside: "EEZ ಹತ್ತಿರ / ಹೊರಗೆ",
    fromPin: "ಪಿನ್‌ನಿಂದ",
    groupNav: "ನ್ಯಾವಿಗೇಷನ್ ಮತ್ತು ವಲಯಗಳು",
    fitLayers: "ಎಲ್ಲಾ ಪದರಗಳನ್ನು ತೋರಿಸಿ",
  },
  or: {
    grid: "ମଡେଲ୍ ନମୁନା ଗ୍ରିଡ୍",
    details: "ସ୍ଥାନ ବିବରଣୀ",
    reference: "ଉପଗ୍ରହ ବେସମ୍ୟାପ୍ · ସିଧା ମାପ ନୁହେଁ",
    noTiles: "କମ୍ ଡାଟା ପାଇଁ ପାଠ୍ୟ ଦୃଶ୍ୟ",
    advanced: "ଉନ୍ନତ",
    recenter: "ବଛା ସ୍ଥାନକୁ କେନ୍ଦ୍ର କରନ୍ତୁ",
    guardOn: "ଗାର୍ଡ ଚାଲୁ",
    guardOff: "ଗାର୍ଡ ବନ୍ଦ",
    connected: "ସଂଯୁକ୍ତ",
    fullConnection: "ପୂର୍ଣ୍ଣ ସଂଯୋଗ",
    lowDataMode: "କମ୍ ଡାଟା ମୋଡ୍",
    offlineSaved: "ଅଫଲାଇନ୍ · ସଞ୍ଚିତ ସୂଚନା",
    rangeRings: "ଦୂରତା ବଳୟ · 5/10/20 NM",
    seamarks: "ସମୁଦ୍ର ଚିହ୍ନ · OpenSeaMap",
    vectors: "ଦିଗ ନମୁନା",
    speciesShort: "ଐତିହାସିକ ପ୍ରଜାତି",
    rainfallShort: "ବର୍ଷା ଗ୍ରିଡ୍ · ପରୀକ୍ଷାମୂଳକ",
    eezInside: "EEZ ଭିତରେ",
    eezOutside: "EEZ ପାଖରେ / ବାହାରେ",
    fromPin: "ପିନ୍ ଠାରୁ",
    groupNav: "ନେଭିଗେସନ୍ ଓ କ୍ଷେତ୍ର",
    fitLayers: "ସବୁ ସ୍ତର ଦେଖାନ୍ତୁ",
  },
  pa: {
    grid: "ਮਾਡਲ ਨਮੂਨਾ ਗ੍ਰਿਡ",
    details: "ਥਾਂ ਦੇ ਵੇਰਵੇ",
    reference: "ਸੈਟੇਲਾਈਟ ਬੇਸਮੈਪ · ਲਾਈਵ ਮਾਪ ਨਹੀਂ",
    noTiles: "ਘੱਟ ਡਾਟਾ ਲਈ ਟੈਕਸਟ ਦ੍ਰਿਸ਼",
    advanced: "ਉੱਨਤ",
    recenter: "ਚੁਣੀ ਥਾਂ ਤੇ ਵਾਪਸ ਜਾਓ",
    guardOn: "ਗਾਰਡ ਚਾਲੂ",
    guardOff: "ਗਾਰਡ ਬੰਦ",
    connected: "ਜੁੜਿਆ ਹੋਇਆ",
    fullConnection: "ਪੂਰਾ ਕਨੈਕਸ਼ਨ",
    lowDataMode: "ਘੱਟ ਡਾਟਾ ਮੋਡ",
    offlineSaved: "ਆਫ਼ਲਾਈਨ · ਸੰਭਾਲੀ ਜਾਣਕਾਰੀ",
    rangeRings: "ਦੂਰੀ ਚੱਕਰ · 5/10/20 NM",
    seamarks: "ਸਮੁੰਦਰੀ ਚਿੰਨ੍ਹ · OpenSeaMap",
    vectors: "ਦਿਸ਼ਾ ਨਮੂਨੇ",
    speciesShort: "ਇਤਿਹਾਸਕ ਪ੍ਰਜਾਤੀਆਂ",
    rainfallShort: "ਮੀਂਹ ਗ੍ਰਿਡ · ਪ੍ਰਯੋਗਾਤਮਕ",
    eezInside: "EEZ ਅੰਦਰ",
    eezOutside: "EEZ ਨੇੜੇ / ਬਾਹਰ",
    fromPin: "ਪਿੰਨ ਤੋਂ",
    groupNav: "ਨੈਵੀਗੇਸ਼ਨ ਅਤੇ ਖੇਤਰ",
    fitLayers: "ਸਾਰੇ ਪੱਧਰ ਦਿਖਾਓ",
  },
};

export const snapshotStaleCopy: Record<LangCode, string> = {
  en: "Last downloaded marine snapshot — not live.",
  hi: "अंतिम डाउनलोड की गई जानकारी — लाइव नहीं।",
  gu: "છેલ્લે ડાઉનલોડ કરેલી માહિતી — જીવંત નથી.",
  mr: "शेवटची डाउनलोड केलेली सागरी माहिती — थेट नाही.",
  ta: "கடைசியாக பதிவிறக்கிய கடல் தகவல் — நேரடி அல்ல.",
  te: "చివరిగా డౌన్‌లోడ్ చేసిన సముద్ర సమాచారం — ప్రత్యక్షం కాదు.",
  ml: "അവസാനം ഡൗൺലോഡ് ചെയ്ത കടൽ വിവരം — തത്സമയമല്ല.",
  bn: "সর্বশেষ ডাউনলোড করা সামুদ্রিক তথ্য — লাইভ নয়।",
  kn: "ಕೊನೆಯದಾಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿದ ಸಮುದ್ರ ಮಾಹಿತಿ — ನೇರವಲ್ಲ.",
  or: "ଶେଷ ଡାଉନଲୋଡ୍ ହୋଇଥିବା ସମୁଦ୍ର ସୂଚନା — ଲାଇଭ୍ ନୁହେଁ।",
  pa: "ਆਖ਼ਰੀ ਡਾਊਨਲੋਡ ਕੀਤੀ ਸਮੁੰਦਰੀ ਜਾਣਕਾਰੀ — ਲਾਈਵ ਨਹੀਂ।",
};

export const serviceStateCopy: Record<LangCode, { expired: string; signInAgain: string; liveUnreachable: string }> = {
  en: {
    expired: "Your session has expired",
    signInAgain: "For your security, please sign in again.",
    liveUnreachable: "Live services couldn't be reached. Your saved information remains available where possible.",
  },
  hi: {
    expired: "आपका सत्र समाप्त हो गया है",
    signInAgain: "आपकी सुरक्षा के लिए, कृपया फिर से साइन इन करें।",
    liveUnreachable: "लाइव सेवाएँ उपलब्ध नहीं हो सकीं। जहाँ संभव हो आपकी सहेजी गई जानकारी उपलब्ध है।",
  },
  gu: {
    expired: "તમારું સત્ર સમાપ્ત થયું છે",
    signInAgain: "સુરક્ષા માટે, કૃપા કરીને ફરી સાઇન ઇન કરો.",
    liveUnreachable: "જીવંત સેવાઓ સુધી પહોંચી શકાયું નથી. શક્ય હોય ત્યાં તમારી સાચવેલી માહિતી ઉપલબ્ધ છે.",
  },
  mr: {
    expired: "तुमचे सत्र कालबाह्य झाले आहे",
    signInAgain: "तुमच्या सुरक्षिततेसाठी कृपया पुन्हा साइन इन करा.",
    liveUnreachable: "थेट सेवांपर्यंत पोहोचता आले नाही. शक्य तेथे तुमची जतन माहिती उपलब्ध आहे.",
  },
  ta: {
    expired: "உங்கள் அமர்வு காலாவதியாகிவிட்டது",
    signInAgain: "உங்கள் பாதுகாப்பிற்காக மீண்டும் உள்நுழையவும்.",
    liveUnreachable: "நேரடி சேவைகளை அணுக முடியவில்லை. சேமித்த தகவல் கிடைக்கும் இடங்களில் உள்ளது.",
  },
  te: {
    expired: "మీ సెషన్ గడువు ముగిసింది",
    signInAgain: "మీ భద్రత కోసం దయచేసి మళ్లీ సైన్ ఇన్ చేయండి.",
    liveUnreachable: "ప్రత్యక్ష సేవలు అందుబాటులో లేవు. మీ సేవ్ చేసిన సమాచారం అందుబాటులో ఉంది.",
  },
  ml: {
    expired: "നിങ്ങളുടെ സെഷൻ കാലഹരണപ്പെട്ടു",
    signInAgain: "നിങ്ങളുടെ സുരക്ഷയ്ക്കായി ദയവായി വീണ്ടും സൈൻ ഇൻ ചെയ്യുക.",
    liveUnreachable: "തത്സമയ സേവനങ്ങൾ ലഭ്യമല്ല. സൂക്ഷിച്ച വിവരങ്ങൾ സാധ്യമായ ഇടങ്ങളിൽ ലഭ്യമാണ്.",
  },
  bn: {
    expired: "আপনার সেশনের মেয়াদ শেষ হয়েছে",
    signInAgain: "আপনার নিরাপত্তার জন্য অনুগ্রহ করে আবার সাইন ইন করুন।",
    liveUnreachable: "লাইভ পরিষেবায় পৌঁছানো যায়নি। যেখানে সম্ভব আপনার সংরক্ষিত তথ্য উপলব্ধ আছে।",
  },
  kn: {
    expired: "ನಿಮ್ಮ ಸೆಷನ್ ಅವಧಿ ಮುಗಿದಿದೆ",
    signInAgain: "ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ದಯವಿಟ್ಟು ಮತ್ತೆ ಸೈನ್ ಇನ್ ಮಾಡಿ.",
    liveUnreachable: "ನೇರ ಸೇವೆಗಳನ್ನು ತಲುಪಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಉಳಿಸಿದ ಮಾಹಿತಿ ಸಾಧ್ಯವಿರುವಲ್ಲಿ ಲಭ್ಯವಿದೆ.",
  },
  or: {
    expired: "ଆପଣଙ୍କ ସେସନ୍ ଅବଧି ଶେଷ ହୋଇଛି",
    signInAgain: "ଆପଣଙ୍କ ସୁରକ୍ଷା ପାଇଁ ଦୟାକରି ପୁଣି ସାଇନ୍ ଇନ୍ କରନ୍ତୁ।",
    liveUnreachable: "ଲାଇଭ୍ ସେବା ଉପଲବ୍ଧ ହୋଇପାରିଲା ନାହିଁ। ସଞ୍ଚିତ ସୂଚନା ଯଥାସମ୍ଭବ ଉପଲବ୍ଧ ଅଛି।",
  },
  pa: {
    expired: "ਤੁਹਾਡਾ ਸੈਸ਼ਨ ਸਮਾਪਤ ਹੋ ਗਿਆ ਹੈ",
    signInAgain: "ਤੁਹਾਡੀ ਸੁਰੱਖਿਆ ਲਈ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਸਾਈਨ ਇਨ ਕਰੋ।",
    liveUnreachable: "ਲਾਈਵ ਸੇਵਾਵਾਂ ਤੱਕ ਪਹੁੰਚ ਨਹੀਂ ਹੋ ਸਕੀ। ਤੁਹਾਡੀ ਸੰਭਾਲੀ ਜਾਣਕਾਰੀ ਜਿੱਥੇ ਸੰਭਵ ਹੋਵੇ ਉਪਲਬਧ ਹੈ।",
  },
};
