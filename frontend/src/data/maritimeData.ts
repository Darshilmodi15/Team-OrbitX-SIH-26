export interface Port {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  type: 'Major Port' | 'Fishing Harbor' | 'Coastal Jetty';
  description: string;
}

export interface PFZZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  depth_m: number;
  sst_c: number;
  chlorophyll_mg_m3: number;
  dominant_species: string;
  confidence: number;
  yield_level: 'Very High' | 'High' | 'Moderate';
  recommended_gear: string;
  distance_km?: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  category: 'IMBL' | 'MPA' | 'Security';
  risk: 'CRITICAL_DANGER' | 'RESTRICTED_MPA' | 'BUFFER_ALERT';
  description: string;
  color: string;
  coordinates: [number, number][];
}

export interface WeatherMetrics {
  wave_height_m: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  forecast: 'clear' | 'rainy' | 'stormy' | 'squall';
  temperature_c: number;
  sst_c: number;
  swell_period_s: number;
  tide_state: 'High Tide (+1.8m)' | 'Low Tide (+0.3m)' | 'Slack Tide';
  visibility_km: number;
  cyclone_warning: boolean;
  cyclone_name?: string;
}

export interface QuickPrompt {
  id: string;
  text: string;
  category: 'safety' | 'pfz' | 'navigation' | 'geofence' | 'ecology';
}

export const INDIAN_PORTS: Port[] = [
  { id: 'mumbai', name: 'Mumbai Sassoon Dock', state: 'Maharashtra', lat: 18.9220, lon: 72.8347, type: 'Fishing Harbor', description: 'Primary west coast commercial fish landing center' },
  { id: 'veraval', name: 'Veraval Fishing Port', state: 'Gujarat', lat: 20.9077, lon: 70.3678, type: 'Fishing Harbor', description: 'Largest artisanal & mechanized trawler hub in Arabian Sea' },
  { id: 'porbandar', name: 'Porbandar Marine Jetty', state: 'Gujarat', lat: 21.6417, lon: 69.6093, type: 'Fishing Harbor', description: 'Deep-sea gillnetter & trawler staging base' },
  { id: 'kochi', name: 'Kochi Thoppumpady Harbor', state: 'Kerala', lat: 9.9312, lon: 76.2673, type: 'Fishing Harbor', description: 'Hub for pelagic tuna & squid longliners' },
  { id: 'mangaluru', name: 'Mangaluru Old Port (Bunder)', state: 'Karnataka', lat: 12.8596, lon: 74.8364, type: 'Fishing Harbor', description: 'Major purse-seiner landing jetty' },
  { id: 'chennai', name: 'Chennai Kasimedu Harbor', state: 'Tamil Nadu', lat: 13.1250, lon: 80.2980, type: 'Fishing Harbor', description: 'Coromandel coast mechanized harbor' },
  { id: 'rameswaram', name: 'Rameswaram Pamban Port', state: 'Tamil Nadu', lat: 9.2876, lon: 79.3129, type: 'Coastal Jetty', description: 'Palk Bay shallow artisanal fishing center near IMBL' },
  { id: 'vizag', name: 'Visakhapatnam Fishing Port', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185, type: 'Fishing Harbor', description: 'East coast deep-sea shrimp & pelagic fleet hub' },
  { id: 'paradip', name: 'Paradip Marine Harbor', state: 'Odisha', lat: 20.2644, lon: 86.6710, type: 'Fishing Harbor', description: 'Bay of Bengal Hilsa & Croaker fleet center' },
];

export const GEOFENCE_ZONES: GeofenceZone[] = [
  {
    id: 'imbl-srilanka',
    name: 'India - Sri Lanka International Maritime Boundary Line (IMBL)',
    category: 'IMBL',
    risk: 'CRITICAL_DANGER',
    description: 'Strict international boundary across Palk Strait. Crossing leads to immediate detention by foreign naval forces.',
    color: '#ef4444',
    coordinates: [
      [10.08, 79.86],
      [9.95, 79.62],
      [9.67, 79.43],
      [9.35, 79.30],
      [9.10, 79.25],
      [8.85, 79.05],
      [8.50, 78.90],
    ],
  },
  {
    id: 'imbl-pakistan',
    name: 'India - Pakistan Maritime Boundary (Sir Creek Buffer Zone)',
    category: 'IMBL',
    risk: 'CRITICAL_DANGER',
    description: 'High-security contested maritime border off Kutch. Strictly no fishing permitted beyond 23.3° N.',
    color: '#ef4444',
    coordinates: [
      [23.60, 67.80],
      [23.35, 68.10],
      [23.15, 68.35],
      [22.80, 68.60],
    ],
  },
  {
    id: 'mpa-gulf-mannar',
    name: 'Gulf of Mannar Marine National Park',
    category: 'MPA',
    risk: 'RESTRICTED_MPA',
    description: 'Ecologically sensitive coral reef & Dugong habitat. Commercial bottom trawling is strictly prohibited under WPA 1972.',
    color: '#f59e0b',
    coordinates: [
      [9.25, 79.15],
      [9.30, 79.35],
      [9.15, 79.40],
      [8.95, 79.10],
      [9.05, 78.85],
      [9.25, 79.15],
    ],
  },
  {
    id: 'mpa-sundarbans',
    name: 'Sundarbans Marine Biosphere Reserve Buffer',
    category: 'MPA',
    risk: 'RESTRICTED_MPA',
    description: 'World Heritage Mangrove Estuary & Tiger Reserve marine buffer. Motorized trawling prohibited in core delta.',
    color: '#f59e0b',
    coordinates: [
      [21.80, 88.60],
      [21.85, 89.10],
      [21.40, 89.15],
      [21.35, 88.50],
      [21.80, 88.60],
    ],
  },
];

export const MOCK_PFZ_ZONES: PFZZone[] = [
  {
    id: 'PFZ-101',
    name: 'Thermal Front Sector Alpha',
    lat: 18.9850,
    lon: 72.4500,
    depth_m: 65,
    sst_c: 28.2,
    chlorophyll_mg_m3: 1.85,
    dominant_species: 'Yellowfin Tuna & Skipjack',
    confidence: 94,
    yield_level: 'Very High',
    recommended_gear: 'Drift Gillnet / Longline',
  },
  {
    id: 'PFZ-102',
    name: 'Shelf Break Upwelling Zone Bravo',
    lat: 18.7200,
    lon: 72.5800,
    depth_m: 85,
    sst_c: 27.8,
    chlorophyll_mg_m3: 2.10,
    dominant_species: 'Kingfish, Seer Fish & Cobia',
    confidence: 91,
    yield_level: 'Very High',
    recommended_gear: 'Trolling / Handline',
  },
  {
    id: 'PFZ-103',
    name: 'Chlorophyll Plume Sector Charlie',
    lat: 19.1200,
    lon: 72.6200,
    depth_m: 45,
    sst_c: 29.1,
    chlorophyll_mg_m3: 1.45,
    dominant_species: 'Indian Mackerel & Sardines',
    confidence: 86,
    yield_level: 'High',
    recommended_gear: 'Purse Seine / Ring Net',
  },
  {
    id: 'PFZ-104',
    name: 'Saurashtra Thermal Front Omega',
    lat: 20.6500,
    lon: 70.1200,
    depth_m: 75,
    sst_c: 27.4,
    chlorophyll_mg_m3: 2.40,
    dominant_species: 'Silver Pomfret & Ribbonfish',
    confidence: 96,
    yield_level: 'Very High',
    recommended_gear: 'Bottom Trawl / Gillnet',
  },
  {
    id: 'PFZ-105',
    name: 'Malabar Coastal Upwelling Zone',
    lat: 9.7500,
    lon: 75.9200,
    depth_m: 55,
    sst_c: 28.6,
    chlorophyll_mg_m3: 2.30,
    dominant_species: 'Oil Sardine & Mackerel',
    confidence: 89,
    yield_level: 'High',
    recommended_gear: 'Ring Seine',
  },
  {
    id: 'PFZ-106',
    name: 'Coromandel Deep Pelagic Front',
    lat: 12.9500,
    lon: 80.6500,
    depth_m: 110,
    sst_c: 28.8,
    chlorophyll_mg_m3: 1.60,
    dominant_species: 'Swordfish, Barracuda & Tuna',
    confidence: 88,
    yield_level: 'High',
    recommended_gear: 'Deep Pelagic Longline',
  }
];

export const QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'q1', text: 'Where is the nearest Potential Fishing Zone (PFZ) today?', category: 'pfz' },
  { id: 'q2', text: 'Is it safe to venture into the sea tomorrow morning?', category: 'safety' },
  { id: 'q3', text: 'What is the safest route to Zone Alpha considering weather?', category: 'navigation' },
  { id: 'q4', text: 'Are there any cyclone or high wave alerts in my area?', category: 'safety' },
  { id: 'q5', text: 'Warn me if my vessel approaches international maritime boundaries (IMBL).', category: 'geofence' },
  { id: 'q6', text: 'Why has fish catch productivity declined near Ratnagiri?', category: 'ecology' },
];

export const REGIONAL_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect (Bhashini AI)', native: '🌐 Auto Detect' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];


export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    appTitle: 'ORCA Marine AI',
    tagline: 'Autonomous Marine Intelligence & Decision Support',
    safeHeading: 'Safe for Navigation',
    cautionHeading: 'Caution Advised',
    dangerHeading: 'Severe Danger — Do Not Venture',
    nearestPfz: 'Nearest Potential Fishing Zone',
    viewReasoning: 'Explainable Agent Trace',
    askVoice: 'Tap to Speak Query',
    listening: 'Listening to your voice...',
    selectPort: 'Select Coastal Base',
    currentVesselPos: 'Current Vessel GPS',
    imblAlert: 'IMBL Boundary Warning',
    sstLayer: 'SST Heatmap',
    chloroLayer: 'Chlorophyll-a Bloom',
    wavesLayer: 'Wave / Swell Contours',
    windLayer: 'Wind Vector Streamlines',
    geofenceLayer: 'IMBL & MPA Geofences',
    pfzLayer: 'Potential Fishing Zones',
    routeLayer: 'Weather-Safe Nav Route',
  },
  hi: {
    appTitle: 'ऑर्का समुद्री एआई',
    tagline: 'स्वायत्त समुद्री बुद्धिमत्ता एवं निर्णय सहायता प्रणाली',
    safeHeading: 'समुद्र में नौकायन सुरक्षित है',
    cautionHeading: 'सावधानी बरतें',
    dangerHeading: 'अत्यधिक खतरा — समुद्र में न जाएं',
    nearestPfz: 'निकटतम संभावित मत्स्य क्षेत्र (PFZ)',
    viewReasoning: 'एआई एजेंट तर्क विवरण',
    askVoice: 'बोलकर प्रश्न पूछें',
    listening: 'आपकी आवाज सुनी जा रही है...',
    selectPort: 'तटीय बंदरगाह चुनें',
    currentVesselPos: 'नाव का वर्तमान जीपीएस',
    imblAlert: 'अंतर्राष्ट्रीय समुद्री सीमा चेतावनी',
    sstLayer: 'समुद्री तापमान (SST)',
    chloroLayer: 'क्लोरोफिल-ए घनत्व',
    wavesLayer: 'समुद्री लहरें / तरंगें',
    windLayer: 'हवा की गति एवं दिशा',
    geofenceLayer: 'आईएमबीएल एवं संरक्षित क्षेत्र',
    pfzLayer: 'मछली पकड़ने के क्षेत्र (PFZ)',
    routeLayer: 'सुरक्षित नेविगेशन मार्ग',
  },
  gu: {
    appTitle: 'ઓર્કા મરીન એઆઇ',
    tagline: 'સ્વાયત્ત સમુદ્રી બુદ્ધિમત્તા અને નિર્ણય સહાયક પ્લેટફોર્મ',
    safeHeading: 'સમુદ્રમાં જવું સુરક્ષિત છે',
    cautionHeading: 'સાવચેતી રાખવી જરૂરી છે',
    dangerHeading: 'અત્યંત જોખમી — દરિયામાં જવું નહીં',
    nearestPfz: 'નજીકનો સંભવિત માછીમારી વિસ્તાર (PFZ)',
    viewReasoning: 'એજન્ટ તર્ક વિશ્લેષણ',
    askVoice: 'બોલીને પ્રશ્ન પૂછો',
    listening: 'સાંભળી રહ્યા છીએ...',
    selectPort: 'બંદર પસંદ કરો',
    currentVesselPos: 'બોટનું જીપીએસ લોકેશન',
    imblAlert: 'આંતરરાષ્ટ્રીય સરહદ ચેતવણી (IMBL)',
    sstLayer: 'સમુદ્ર સપાટીનું તાપમાન (SST)',
    chloroLayer: 'ક્લોરોફિલ ઘનતા',
    wavesLayer: 'મોજાંઓની ઊંચાઈ',
    windLayer: 'પવનની ગતિ',
    geofenceLayer: 'સરહદ અને સંરક્ષિત ક્ષેત્ર',
    pfzLayer: 'માછીમારી ઝોન (PFZ)',
    routeLayer: 'સુરક્ષિત નેવિગેશન માર્ગ',
  },
  ta: {
    appTitle: 'ஆர்கா கடல்சார் AI',
    tagline: 'தன்னாட்சி கடல்சார் நுண்ணறிவு மற்றும் முடிவெடுக்கும் தளம்',
    safeHeading: 'கடலுக்குள் செல்ல பாதுகாப்பானது',
    cautionHeading: 'எச்சரிக்கை தேவை',
    dangerHeading: 'கடுமையான ஆபத்து — கடலுக்குள் செல்ல வேண்டாம்',
    nearestPfz: 'அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலம் (PFZ)',
    viewReasoning: 'முகவர் பகுத்தறிவு சான்றுகள்',
    askVoice: 'பேசி கேள்வி கேளுங்கள்',
    listening: 'கேட்கிறது...',
    selectPort: 'துறைமுகத்தை தேர்ந்தெடுக்கவும்',
    currentVesselPos: 'படகு ஜிபிஎஸ் நிலை',
    imblAlert: 'சர்வதேச கடல் எல்லை எச்சரிக்கை (IMBL)',
    sstLayer: 'கடல் மேற்பரப்பு வெப்பநிலை (SST)',
    chloroLayer: 'குளோரோபில் அடர்த்தி',
    wavesLayer: 'அலைகளின் உயரம்',
    windLayer: 'காற்று வேகம்',
    geofenceLayer: 'IMBL & பாதுகாக்கப்பட்ட பகுதிகள்',
    pfzLayer: 'சாத்தியமான மீன்பிடி மண்டலங்கள்',
    routeLayer: 'பாதுகாப்பான வழித்தடம்',
  },
  ml: {
    appTitle: 'ഓർക്ക മറൈൻ AI',
    tagline: 'സമുദ്ര വിവര വിവേചന പ്ലാറ്റ്ഫോം',
    safeHeading: 'കടലിൽ പോകുന്നത് സുരക്ഷിതമാണ്',
    cautionHeading: 'ജാഗ്രത പാലിക്കുക',
    dangerHeading: 'തീവ്ര അപകടം — കടലിൽ പോകരുത്',
    nearestPfz: 'ഏറ്റവും അടുത്തുള്ള മത്സ്യബന്ധന മേഖല (PFZ)',
    viewReasoning: 'ഏജന്റ് യുക്തി വിശകലനം',
    askVoice: 'സംസാരിച്ച് ചോദിക്കുക',
    listening: 'ശ്രദ്ധിക്കുന്നു...',
    selectPort: 'തുറമുഖം തിരഞ്ഞെടുക്കുക',
    currentVesselPos: 'ബോട്ട് ജിപിഎസ്',
    imblAlert: 'അന്താരാഷ്ട്ര അതിർത്തി മുന്നറിയിപ്പ്',
    sstLayer: 'സമുദ്രോപരിതല താപനില (SST)',
    chloroLayer: 'ക്ലോറോഫിൽ സാന്ദ്രത',
    wavesLayer: 'തിരമാല ഉയരം',
    windLayer: 'കാറ്റിന്റെ വേഗത',
    geofenceLayer: 'അതിർത്തി മേഖലകൾ',
    pfzLayer: 'PFZ മേഖലകൾ',
    routeLayer: 'സുരക്ഷിത പാത',
  },
  te: {
    appTitle: 'ఓర్కా మెరైన్ AI',
    tagline: 'సముద్ర భద్రత మరియు నిర్ణయ మద్దతు వ్యవస్థ',
    safeHeading: 'సముద్ర ప్రయాణం సురక్షితం',
    cautionHeading: 'జాగ్రత్త అవసరం',
    dangerHeading: 'తీవ్ర ప్రమాదం — సముద్రంలోకి వెళ్లవద్దు',
    nearestPfz: 'సమీప చేపల వేట ప్రాంతం (PFZ)',
    viewReasoning: 'వివరణాత్మక కారణాలు',
    askVoice: 'మాట్లాడి అడగండి',
    listening: 'వింటున్నాము...',
    selectPort: 'ఓడరేవును ఎంచుకోండి',
    currentVesselPos: 'బోటు జీపీఎస్ స్థానం',
    imblAlert: 'అంతర్జాతీయ సరిహద్దు హెచ్చరిక',
    sstLayer: 'సముద్ర ఉష్ణోగ్రత',
    chloroLayer: 'క్లోరోఫిల్ సాంద్రత',
    wavesLayer: 'అలల ఎత్తు',
    windLayer: 'గాలి వేగం',
    geofenceLayer: 'సరిహద్దు జోన్లు',
    pfzLayer: 'చేపల వేట జోన్లు',
    routeLayer: 'సురక్షిత నావిగేషన్ మార్గం',
  },
  bn: {
    appTitle: 'অরকা সামুদ্রিক এআই',
    tagline: 'স্বায়ত্তশাসিত সামুদ্রিক গোয়েন্দা প্ল্যাটফর্ম',
    safeHeading: 'সমুদ্রে যাওয়া নিরাপদ',
    cautionHeading: 'সতর্কতা অবলম্বন করুন',
    dangerHeading: 'মারাত্মক বিপদ — সমুদ্রে যাবেন না',
    nearestPfz: 'নিকটতম মাছ ধরার সম্ভাব্য অঞ্চল (PFZ)',
    viewReasoning: 'এজেন্ট যুক্তি প্রমাণ',
    askVoice: 'কথা বলে প্রশ্ন করুন',
    listening: 'শুনছি...',
    selectPort: 'বন্দর নির্বাচন করুন',
    currentVesselPos: 'নৌকার বর্তমান জিপিএস',
    imblAlert: 'আন্তর্জাতিক সীমানা সতর্কতা',
    sstLayer: 'সমুদ্রের তাপমাত্রা (SST)',
    chloroLayer: 'ক্লোরোফিল ঘনত্ব',
    wavesLayer: 'ঢেউয়ের উচ্চতা',
    windLayer: 'বাতাসের গতিবেগ',
    geofenceLayer: 'আন্তর্জাতিক সীমান্ত ও সংরক্ষিত এলাকা',
    pfzLayer: 'মাছ ধরার অঞ্চল (PFZ)',
    routeLayer: 'নিরাপদ পথ',
  },
  mr: {
    appTitle: 'ऑर्का सागरी एआय',
    tagline: 'स्वायत्त सागरी गुप्तचर व निर्णय सहाय्य प्रणाली',
    safeHeading: 'समुद्रात जाणे सुरक्षित आहे',
    cautionHeading: 'सावधगिरी बाळगा',
    dangerHeading: 'अतिधोकादायक — समुद्रात जाऊ नका',
    nearestPfz: 'जवळचे संभाव्य मासेमारी क्षेत्र (PFZ)',
    viewReasoning: 'एआय तर्क विश्लेषण',
    askVoice: 'बोलून प्रश्न विचारा',
    listening: 'ऐकत आहे...',
    selectPort: 'किनारपट्टी बंदर निवडा',
    currentVesselPos: 'बोटीचे जीपीएस स्थान',
    imblAlert: 'आंतरराष्ट्रीय सागरी सीमा चेतावणी',
    sstLayer: 'समुद्र पृष्ठभाग तापमान (SST)',
    chloroLayer: 'क्लोरोफिल घनता',
    wavesLayer: 'लाटांची उंची',
    windLayer: 'वाऱ्याचा वेग',
    geofenceLayer: 'आयएमबीएल व संरक्षित क्षेत्र',
    pfzLayer: 'मासेमारी क्षेत्र (PFZ)',
    routeLayer: 'सुरक्षित नौकानयन मार्ग',
  }
};
