import type { Coords } from "./geo";
import type { ForecastPoint, MarineBundle, MarineSnapshot, SafetyLevel } from "./types";

/**
 * Live marine + weather data.
 * Source: Open-Meteo Marine and Forecast APIs (no key required, real data).
 */

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

function nearestHourIndex(times: string[]): number {
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

export function safetyFrom(waveM: number | null, windKmh: number | null, visKm?: number | null): SafetyLevel {
  const wave = waveM ?? 0;
  const wind = windKmh ?? 0;
  const vis = visKm ?? 10;
  if (wave >= 4 || wind >= 62) return "emergency";
  if (wave >= 2.5 || wind >= 40 || vis < 1) return "dangerous";
  if (wave >= 1.5 || wind >= 25 || vis < 4) return "caution";
  return "safe";
}

type Hourly<T> = Record<string, T>;

export async function fetchMarineBundle(c: Coords, signal?: AbortSignal): Promise<MarineBundle> {
  const common = `latitude=${c.lat.toFixed(3)}&longitude=${c.lon.toFixed(3)}&timezone=auto&past_days=1&forecast_days=2`;

  const [marineRes, weatherRes] = await Promise.all([
    fetch(
      `${MARINE_URL}?${common}&hourly=wave_height,wave_period,sea_surface_temperature`,
      signal ? { signal } : {},
    ),
    fetch(
      `${WEATHER_URL}?${common}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,visibility,weather_code`,
      signal ? { signal } : {},
    ),
  ]);

  if (!weatherRes.ok) throw new Error(`weather_unavailable_${weatherRes.status}`);

  const weather = (await weatherRes.json()) as {
    hourly: Hourly<(number | null)[]> & { time: string[] };
  };
  const marine = marineRes.ok
    ? ((await marineRes.json()) as { hourly: Hourly<(number | null)[]> & { time: string[] } })
    : null;

  const times = weather.hourly.time;
  const at = (h: Hourly<(number | null)[]> | undefined, key: string, i: number): number | null =>
    (h?.[key]?.[i] as number | null | undefined) ?? null;
  const idx = nearestHourIndex(times);

  const marineTimes = marine?.hourly.time ?? [];
  const marineIdxFor = (iso: string) => marineTimes.indexOf(iso);

  const waveAt = (iso: string) => {
    const i = marineIdxFor(iso);
    return i >= 0 ? at(marine?.hourly, "wave_height", i) : null;
  };

  const sources = ["Open-Meteo Weather"];
  if (marine) sources.push("Open-Meteo Marine");

  const visRaw = at(weather.hourly, "visibility", idx);
  const nowIso = times[idx] ?? new Date().toISOString();
  const marineIdxNow = marineIdxFor(nowIso);

  const current: MarineSnapshot = {
    time: nowIso,
    waveHeightM: waveAt(nowIso),
    wavePeriodS: marineIdxNow >= 0 ? at(marine?.hourly, "wave_period", marineIdxNow) : null,
    seaTemperatureC:
      marineIdxNow >= 0 ? at(marine?.hourly, "sea_surface_temperature", marineIdxNow) : null,
    windSpeedKmh: at(weather.hourly, "wind_speed_10m", idx),
    windDirectionDeg: at(weather.hourly, "wind_direction_10m", idx),
    visibilityKm: visRaw == null ? null : Math.round((visRaw / 1000) * 10) / 10,
    airTemperatureC: at(weather.hourly, "temperature_2m", idx),
    weatherCode: at(weather.hourly, "weather_code", idx),
    fetchedAt: Date.now(),
    sources,
  };

  const point = (i: number): ForecastPoint => {
    const iso = times[i] ?? nowIso;
    const wave = waveAt(iso);
    const wind = at(weather.hourly, "wind_speed_10m", i);
    return { time: iso, waveHeightM: wave, windSpeedKmh: wind, level: safetyFrom(wave, wind) };
  };

  const forecast: ForecastPoint[] = [];
  for (let i = idx; i < Math.min(idx + 13, times.length); i++) forecast.push(point(i));

  const past: ForecastPoint[] = [];
  for (let i = Math.max(0, idx - 24); i < idx; i++) past.push(point(i));

  return { current, forecast, past };
}

export const WEATHER_CODES_LOCALIZED: Record<string, Record<number, string>> = {
  en: {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 80: "Rain showers", 81: "Heavy showers",
    82: "Violent showers", 95: "Thunderstorm", 96: "Thunderstorm with hail",
    99: "Severe thunderstorm",
  },
  hi: {
    0: "साफ आसमान", 1: "मुख्य रूप से साफ", 2: "आंशिक रूप से बादल", 3: "घने बादल",
    45: "कोहरा", 48: "घना कोहरा", 51: "हल्की बूंदाबांदी", 53: "बूंदाबांदी",
    55: "भारी बूंदाबांदी", 61: "हल्की बारिश", 63: "बारिश", 65: "भारी बारिश",
    71: "हल्की बर्फबारी", 80: "बारिश की बौछारें", 81: "तेज़ बौछारें",
    82: "मूसलाधार बारिश", 95: "गरज के साथ तूफान", 96: "ओलावृष्टि के साथ तूफान",
    99: "भीषण तूफान",
  },
  gu: {
    0: "ચોખ્ખું આકાશ", 1: "મુખ્યત્વે સ્વચ્છ", 2: "અંશતઃ વાદળછાયું", 3: "વાદળછાયું",
    45: "ધૂમ્મસ", 48: "ગાઢ ધૂમ્મસ", 51: "હળવી ઝરમર", 53: "ઝરમર વરસાદ",
    55: "ભારે ઝરમર", 61: "હળવો વરસાદ", 63: "વરસાદ", 65: "ભારે વરસાદ",
    71: "બરફવર્ષા", 80: "વરસાદી ઝાપટાં", 81: "ભારે ઝાપટાં",
    82: "મુશળધાર વરસાદ", 95: "ગાજવીજ સાથે વાવાઝોડું", 96: "કરા સાથે વાવાઝોડું",
    99: "તીવ્ર વાવાઝોડું",
  },
  mr: {
    0: "निरभ्र आकाश", 1: "मुख्यतः स्वच्छ", 2: "काही प्रमाणात ढगाळ", 3: "ढगाळ",
    45: "धुके", 48: "दाट धुके", 51: "हलकी रिमझिम", 53: "रिमझिम",
    55: "जोरदार रिमझिम", 61: "हलका पाऊस", 63: "पाऊस", 65: "मुसळधार पाऊस",
    71: "हिमवृष्टी", 80: "पावसाच्या सरी", 81: "जोरदार सरी",
    82: "अतिवृष्टी", 95: "वादळी पाऊस", 96: "गारांसह वादळ",
    99: "तीव्र वादळ",
  },
  ta: {
    0: "தெளிவான வானம்", 1: "பெரும்பாலும் தெளிவு", 2: "பகுதி மேகமூட்டம்", 3: "முழு மேகமூட்டம்",
    45: "பனிமூட்டம்", 48: "அடர்ந்த பனி", 51: "லேசான தூறல்", 53: "தூறல்",
    55: "கனத்த தூறல்", 61: "லேசான மழை", 63: "மழை", 65: "கனமழை",
    71: "பனிப்பொழிவு", 80: "மழைச் சாரல்", 81: "கனத்த சாரல்",
    82: "பெரு மழை", 95: "இடிமின்னலுடன் புயல்", 96: "ஆலங்கட்டி மழை புயல்",
    99: "கடும் புயல்",
  },
  te: {
    0: "నిర్మలమైన ఆకాశం", 1: "ఎక్కువగా స్పష్టం", 2: "పాక్షికంగా మేఘావృతం", 3: "పూర్తిగా మేఘావృతం",
    45: "మంచు", 48: "దట్టమైన మంచు", 51: "తేలికపాటి చినుకులు", 53: "చిరుజల్లులు",
    55: "భారీ చినుకులు", 61: "తేలికపాటి వర్షం", 63: "వర్షం", 65: "భారీ వర్షం",
    71: "మంచు కురవడం", 80: "వర్షపు జల్లులు", 81: "భారీ జల్లులు",
    82: "కుండపోత వర్షం", 95: "ఉరుములతో కూడిన తుఫాను", 96: "వడగండ్ల వాన తుఫాను",
    99: "తీవ్రమైన తుఫాను",
  },
  ml: {
    0: "തെളിഞ്ഞ ആകാശം", 1: "പൊതുവെ തെളിഞ്ഞത്", 2: "ഭാഗികമായി മേഘാവൃതം", 3: "മേഘാവൃതം",
    45: "മൂടൽമഞ്ഞ്", 48: "കനത്ത മൂടൽമഞ്ഞ്", 51: "നേരിയ ചാറ്റൽമഴ", 53: "ചാറ്റൽമഴ",
    55: "കനത്ത ചാറ്റൽ", 61: "നേരിയ മഴ", 63: "മഴ", 65: "കനത്ത മഴ",
    71: "മഞ്ഞുവീഴ്ച", 80: "മഴക്കാറ്റ്", 81: "കനത്ത മഴത്തുള്ളികൾ",
    82: "തീവ്രമഴ", 95: "ഇടിമിന്നലോടുകൂടിയ കാറ്റ്", 96: "ആലിപ്പഴത്തോട് കൂടിയ കാറ്റ്",
    99: "അതിതീവ്ര കൊടുങ്കാറ്റ്",
  },
  bn: {
    0: "পরিষ্কার আকাশ", 1: "প্রধানত পরিষ্কার", 2: "আংশিক মেঘলা", 3: "মেঘলা",
    45: "কুয়াশা", 48: "ঘন কুয়াশা", 51: "হালকা গুঁড়ি গুঁড়ি বৃষ্টি", 53: "গুঁড়ি গুঁড়ি বৃষ্টি",
    55: "ভারী গুঁড়ি গুঁড়ি বৃষ্টি", 61: "হালকা বৃষ্টি", 63: "বৃষ্টি", 65: "ভারী বৃষ্টিপাত",
    71: "তুষারপাত", 80: "বৃষ্টির ঝলকানি", 81: "ভারী বৃষ্টির ঝাপটা",
    82: "প্রবল বর্ষণ", 95: "বজ্রবিদ্যুৎ সহ ঝড়", 96: "শিলাবৃষ্টি সহ ঝড়",
    99: "মারাত্মক ঘূর্ণিঝড়",
  },
  kn: {
    0: "ಸ್ವಚ್ಛ ಆಕಾಶ", 1: "ಹೆಚ್ಚಾಗಿ ಸ್ವಚ್ಛ", 2: "ಭಾಗಶಃ ಮೋಡ", 3: "ಮೋಡ ಕವಿದ",
    45: "ಮಂಜು", 48: "ದಟ್ಟ ಮಂಜು", 51: "ಹಗುರ ತುಂತುರು", 53: "ತುಂತುರು ಮಳೆ",
    55: "ಭಾರೀ ತುಂತುರು", 61: "ಹಗುರ ಮಳೆ", 63: "ಮಳೆ", 65: "ಭಾರೀ ಮಳೆ",
    71: "ಹಿಮಪಾತ", 80: "ಮಳೆಯ ಸಿಂಚನ", 81: "ಭಾರೀ ಸಿಂಚನ",
    82: "ಬಿರುಗಾಳಿ ಮಳೆ", 95: "ಗುಡುಗು ಸಹಿತ ಬಿರುಗಾಳಿ", 96: "ಆಲಿಕಲ್ಲು ಸಹಿತ ಬಿರುಗಾಳಿ",
    99: "ತೀವ್ರ ಬಿರುಗಾಳಿ",
  },
  or: {
    0: "ପରିଷ୍କାର ଆକାଶ", 1: "ପ୍ରାୟତଃ ପରିଷ୍କାର", 2: "ଆଂଶିକ ମେଘୁଆ", 3: "ମେଘୁଆ",
    45: "କୁହୁଡ଼ି", 48: "ଘନ କୁହୁଡ଼ି", 51: "ହାଲୁକା ଝିପିଝିପି ବର୍ଷା", 53: "ଝିପିଝିପି ବର୍ଷା",
    55: "ପ୍ରବଳ ଝିପିଝିପି ବର୍ଷା", 61: "ହାଲୁକା ବର୍ଷା", 63: "ବର୍ଷା", 65: "ପ୍ରବଳ ବର୍ଷା",
    71: "ତୁଷାରପାତ", 80: "ବର୍ଷା ଝଲକ", 81: "ପ୍ରବଳ ବର୍ଷା ଝଲକ",
    82: "ମୂଷଳଧାରା ବର୍ଷା", 95: "ଘଡ଼ଘଡ଼ି ସହ ଝଡ଼", 96: "କୁଆପଥର ସହ ଝଡ଼",
    99: "ଭୟଙ୍କର ଝଡ଼",
  },
  pa: {
    0: "ਸਾਫ਼ ਅਸਮਾਨ", 1: "ਜ਼ਿਆਦਾਤਰ ਸਾਫ਼", 2: "ਅੰਸ਼ਕ ਤੌਰ 'ਤੇ ਬੱਦਲਵਾਈ", 3: "ਘਣੇ ਬੱਦਲ",
    45: "ਧੁੰਦ", 48: "ਸੰਘਣੀ ਧੁੰਦ", 51: "ਹਲਕੀ ਬੂੰਦਾ-ਬਾਂਦੀ", 53: "ਬੂੰਦਾ-ਬਾਂਦੀ",
    55: "ਤੇਜ਼ ਬੂੰਦਾ-ਬਾਂਦੀ", 61: "ਹਲਕੀ ਬਾਰਿਸ਼", 63: "ਬਾਰਿਸ਼", 65: "ਭਾਰੀ ਬਾਰਿਸ਼",
    71: "ਬਰਫ਼ਬਾਰੀ", 80: "ਮੀਂਹ ਦੀਆਂ ਫੁਹਾਰਾਂ", 81: "ਤੇਜ਼ ਫੁਹਾਰਾਂ",
    82: "ਮੁਹਲੇਧਾਰ ਮੀਂਹ", 95: "ਗਰਜ ਨਾਲ ਤੂਫ਼ਾਨ", 96: "ਗੜਿਆਂ ਨਾਲ ਤੂਫ਼ਾਨ",
    99: "ਭਿਆਨਕ ਤੂਫ਼ਾਨ",
  },
};

export const WEATHER_CODES: Record<number, string> = WEATHER_CODES_LOCALIZED.en;

export function describeWeather(code: number | null, lang: string = "en"): string {
  if (code == null) return "\u2014";
  const dict = WEATHER_CODES_LOCALIZED[lang] || WEATHER_CODES_LOCALIZED.en;
  return dict[code] ?? WEATHER_CODES_LOCALIZED.en[code] ?? "\u2014";
}

export const COMPASS_DIRS_LOCALIZED: Record<string, string[]> = {
  en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
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

export function compassDirection(deg: number | null, lang: string = "en"): string {
  if (deg == null) return "\u2014";
  const dirs = COMPASS_DIRS_LOCALIZED[lang] || COMPASS_DIRS_LOCALIZED.en;
  return dirs[Math.round(deg / 45) % 8] ?? "\u2014";
}
