import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const LANGUAGES = [
  { code: "en", native: "English", english: "English" },
  { code: "hi", native: "\u0939\u093f\u0928\u094d\u0926\u0940", english: "Hindi" },
  { code: "gu", native: "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0", english: "Gujarati" },
  { code: "mr", native: "\u092e\u0930\u093e\u0920\u0940", english: "Marathi" },
  { code: "ta", native: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd", english: "Tamil" },
  { code: "te", native: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41", english: "Telugu" },
  { code: "ml", native: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02", english: "Malayalam" },
  { code: "bn", native: "\u09ac\u09be\u0982\u09b2\u09be", english: "Bengali" },
  { code: "kn", native: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1", english: "Kannada" },
  { code: "or", native: "\u0b13\u0b21\u0b3c\u0b3f\u0b06", english: "Odia" },
  { code: "pa", native: "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40", english: "Punjabi" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const en = {
  "app.name": "ORCA Marine AI",
  "app.tagline": "National Coastal Safety & Decision Intelligence Platform",
  "app.desc":
    "Real-time coastal intelligence, marine safety alerts, weather awareness and AI-assisted decision support for India\u2019s coastal communities.",

  "nav.dashboard": "Dashboard",
  "nav.map": "Map",
  "nav.alerts": "Alerts",
  "nav.assistant": "Assistant",
  "nav.services": "Services",
  "nav.settings": "Settings",

  "cta.getStarted": "Get Started",
  "cta.explore": "Explore Platform",
  "cta.continue": "Continue",
  "cta.back": "Back",
  "cta.signIn": "Sign in",
  "cta.register": "Create account",
  "cta.signOut": "Sign out",
  "cta.retry": "Try again",

  "land.f1": "Marine Safety",
  "land.f1d": "Know whether it is safe to go out, before you leave shore.",
  "land.f2": "Weather & Ocean Conditions",
  "land.f2d": "Waves, wind, visibility and sea temperature for your location.",
  "land.f3": "Coastal Alerts",
  "land.f3d": "Official advisories and warnings for your coastal district.",
  "land.f4": "Multilingual AI Assistant",
  "land.f4d": "Ask questions in your own language and get plain answers.",

  "lang.title": "Choose your language",
  "lang.subtitle": "The entire application will use the language you select.",

  "auth.title": "Sign in to ORCA",
  "auth.registerTitle": "Create your ORCA account",
  "auth.subtitle": "Your account keeps your location, language and alerts in sync.",
  "auth.name": "Full name",
  "auth.mobile": "Mobile number",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirm": "Confirm password",
  "auth.haveAccount": "Already have an account?",
  "auth.noAccount": "New to ORCA?",
  "auth.mismatch": "Passwords do not match.",
  "auth.invalid": "Enter a valid mobile number or email and a password of at least 6 characters.",
  "auth.localNotice":
    "Accounts are stored on this device until the secure account service is connected.",

  "loc.title": "Set your location",
  "loc.why":
    "Your location helps ORCA determine nearby coastal conditions, safety alerts, weather and maritime boundaries.",
  "loc.allow": "Allow GPS location",
  "loc.manual": "Choose location manually",
  "loc.denied": "Location permission was denied. You can still choose your location manually.",
  "loc.unavailable": "GPS is unavailable on this device. Please choose your location manually.",
  "loc.outsideIndia":
    "ORCA Marine AI operates only within India. Please select a location inside India.",
  "loc.inland":
    "ORCA Marine AI currently provides coastal safety intelligence for India\u2019s coastal regions. This location is outside the supported coastal operational area.",
  "loc.chooseCoastal": "Choose coastal location",
  "loc.confirm": "Confirm this location",
  "loc.current": "Current location",
  "loc.change": "Change location",
  "loc.coastDistance": "Distance to coastline",
  "loc.searching": "Finding your location\u2026",
  "loc.search": "Search a coastal place",
  "loc.tapMap": "Tap the map to place your location pin.",

  "status.title": "Current safety status",
  "status.safe": "Safe to go",
  "status.safeDesc": "Current conditions are within normal operational limits.",
  "status.caution": "Caution",
  "status.cautionDesc": "Conditions are changing. Exercise additional caution.",
  "status.dangerous": "Dangerous",
  "status.dangerousDesc": "Current conditions may be unsafe for marine activity.",
  "status.emergency": "Emergency",
  "status.emergencyDesc": "Immediate safety action may be required.",

  "marine.title": "Marine conditions",
  "marine.wave": "Wave height",
  "marine.period": "Wave period",
  "marine.wind": "Wind speed",
  "marine.windDir": "Wind direction",
  "marine.visibility": "Visibility",
  "marine.sst": "Sea temperature",
  "marine.air": "Air temperature",
  "marine.weather": "Weather",

  "forecast.title": "Next hours",
  "forecast.now": "Now",
  "forecast.tabCurrent": "Current",
  "forecast.tabPast": "Past 24 h",
  "forecast.tabForecast": "Forecast",

  "alerts.title": "Coastal alerts",
  "alerts.none": "No active advisories for your area.",
  "alerts.official": "Official advisory",

  "map.title": "Your coastal area",
  "map.open": "Open map",
  "map.layers": "Map layers",
  "map.myLocation": "My location",
  "map.legend": "Legend",
  "map.coastalZone": "Supported coastal zone",
  "map.yourPin": "Your location",

  "chat.title": "Ask ORCA",
  "chat.subtitle": "Maritime assistant",
  "chat.placeholder": "Ask anything about your coastal safety\u2026",
  "chat.send": "Send",
  "chat.thinking": "Preparing answer\u2026",
  "chat.s1": "Is it safe to go fishing today?",
  "chat.s2": "What is the wind speed right now?",
  "chat.s3": "What does PFZ mean?",
  "chat.s4": "Emergency numbers",

  "quick.title": "Quick actions",
  "quick.weather": "Marine weather",
  "quick.zones": "Fishing zones",
  "quick.emergency": "Emergency",
  "quick.alerts": "Alerts",

  "svc.title": "Emergency & government services",
  "svc.call": "Call",
  "svc.sos": "Emergency help",
  "svc.sosConfirm": "Call the national emergency number 112 now?",
  "svc.shareLocation": "Share my location",
  "svc.copied": "Location copied. Paste it into a message or call.",

  "glossary.title": "What these terms mean",

  "state.loading": "Loading\u2026",
  "state.loadingMarine": "Loading marine conditions\u2026",
  "state.error": "Something went wrong.",
  "state.liveUnavailable": "Live data temporarily unavailable",
  "state.offline": "Connection unavailable. Showing the latest saved information.",
  "state.updated": "Updated",
  "state.minsAgo": "min ago",
  "state.live": "Live",
  "state.source": "Source",
  "state.comingSoon": "Coming soon",

  "footer.privacy": "Privacy Policy",
  "footer.terms": "Terms & Conditions",
  "footer.rights": "For India\u2019s coastal communities.",
} as const;

export type TKey = keyof typeof en;
type Dict = Partial<Record<TKey, string>>;

const hi: Dict = {
  "app.tagline": "\u0930\u093e\u0937\u094d\u091f\u094d\u0930\u0940\u092f \u0924\u091f\u0940\u092f \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u090f\u0935\u0902 \u0928\u093f\u0930\u094d\u0923\u092f \u092c\u0941\u0926\u094d\u0927\u093f\u092e\u0924\u094d\u0924\u093e \u092e\u0902\u091a",
  "nav.dashboard": "\u0921\u0948\u0936\u092c\u094b\u0930\u094d\u0921",
  "nav.map": "\u092e\u093e\u0928\u091a\u093f\u0924\u094d\u0930",
  "nav.alerts": "\u091a\u0947\u0924\u093e\u0935\u0928\u093f\u092f\u093e\u0901",
  "nav.assistant": "\u0938\u0939\u093e\u092f\u0915",
  "nav.services": "\u0938\u0947\u0935\u093e\u090f\u0901",
  "nav.settings": "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938",
  "cta.getStarted": "\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
  "cta.explore": "\u092e\u0902\u091a \u0926\u0947\u0916\u0947\u0902",
  "cta.continue": "\u0906\u0917\u0947 \u092c\u0922\u093c\u0947\u0902",
  "cta.back": "\u092a\u0940\u091b\u0947",
  "cta.signIn": "\u0938\u093e\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902",
  "cta.register": "\u0916\u093e\u0924\u093e \u092c\u0928\u093e\u090f\u0901",
  "cta.signOut": "\u0938\u093e\u0907\u0928 \u0906\u0909\u091f",
  "cta.retry": "\u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902",
  "lang.title": "\u0905\u092a\u0928\u0940 \u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902",
  "lang.subtitle": "\u092a\u0942\u0930\u093e \u090f\u092a\u094d\u0932\u093f\u0915\u0947\u0936\u0928 \u0906\u092a\u0915\u0940 \u091a\u0941\u0928\u0940 \u0939\u0941\u0908 \u092d\u093e\u0937\u093e \u092e\u0947\u0902 \u0926\u093f\u0916\u0947\u0917\u093e\u0964",
  "status.title": "\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u0938\u094d\u0925\u093f\u0924\u093f",
  "status.safe": "\u091c\u093e\u0928\u093e \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924",
  "status.safeDesc": "\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0938\u094d\u0925\u093f\u0924\u093f\u092f\u093e\u0901 \u0938\u093e\u092e\u093e\u0928\u094d\u092f \u0938\u0940\u092e\u093e \u0915\u0947 \u092d\u0940\u0924\u0930 \u0939\u0948\u0902\u0964",
  "status.caution": "\u0938\u093e\u0935\u0927\u093e\u0928\u0940",
  "status.cautionDesc": "\u0938\u094d\u0925\u093f\u0924\u093f\u092f\u093e\u0901 \u092c\u0926\u0932 \u0930\u0939\u0940 \u0939\u0948\u0902\u0964 \u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u0938\u093e\u0935\u0927\u093e\u0928\u0940 \u0930\u0916\u0947\u0902\u0964",
  "status.dangerous": "\u0916\u0924\u0930\u0928\u093e\u0915",
  "status.dangerousDesc": "\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0938\u094d\u0925\u093f\u0924\u093f\u092f\u093e\u0901 \u0938\u092e\u0941\u0926\u094d\u0930\u0940 \u0917\u0924\u093f\u0935\u093f\u0927\u093f \u0915\u0947 \u0932\u093f\u090f \u0905\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0939\u094b \u0938\u0915\u0924\u0940 \u0939\u0948\u0902\u0964",
  "status.emergency": "\u0906\u092a\u093e\u0924\u0915\u093e\u0932",
  "marine.title": "\u0938\u092e\u0941\u0926\u094d\u0930\u0940 \u0938\u094d\u0925\u093f\u0924\u093f\u092f\u093e\u0901",
  "marine.wave": "\u0932\u0939\u0930 \u0915\u0940 \u090a\u0901\u091a\u093e\u0908",
  "marine.wind": "\u0939\u0935\u093e \u0915\u0940 \u0917\u0924\u093f",
  "marine.visibility": "\u0926\u0943\u0936\u094d\u092f\u0924\u093e",
  "marine.sst": "\u0938\u092e\u0941\u0926\u094d\u0930\u0940 \u0924\u093e\u092a\u092e\u093e\u0928",
  "marine.weather": "\u092e\u094c\u0938\u092e",
  "forecast.title": "\u0905\u0917\u0932\u0947 \u0918\u0902\u091f\u0947",
  "forecast.now": "\u0905\u092d\u0940",
  "alerts.title": "\u0924\u091f\u0940\u092f \u091a\u0947\u0924\u093e\u0935\u0928\u093f\u092f\u093e\u0901",
  "alerts.none": "\u0906\u092a\u0915\u0947 \u0915\u094d\u0937\u0947\u0924\u094d\u0930 \u0915\u0947 \u0932\u093f\u090f \u0915\u094b\u0908 \u0938\u0915\u094d\u0930\u093f\u092f \u0938\u0932\u093e\u0939 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
  "map.title": "\u0906\u092a\u0915\u093e \u0924\u091f\u0940\u092f \u0915\u094d\u0937\u0947\u0924\u094d\u0930",
  "map.open": "\u092e\u093e\u0928\u091a\u093f\u0924\u094d\u0930 \u0916\u094b\u0932\u0947\u0902",
  "chat.title": "ORCA \u0938\u0947 \u092a\u0942\u091b\u0947\u0902",
  "chat.placeholder": "\u0905\u092a\u0928\u0940 \u0924\u091f\u0940\u092f \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u0915\u0947 \u092c\u093e\u0930\u0947 \u092e\u0947\u0902 \u0915\u0941\u091b \u092d\u0940 \u092a\u0942\u091b\u0947\u0902\u2026",
  "chat.send": "\u092d\u0947\u091c\u0947\u0902",
  "quick.title": "\u0924\u094d\u0935\u0930\u093f\u0924 \u0915\u093e\u0930\u094d\u092f",
  "svc.title": "\u0906\u092a\u093e\u0924\u0915\u093e\u0932\u0940\u0928 \u090f\u0935\u0902 \u0938\u0930\u0915\u093e\u0930\u0940 \u0938\u0947\u0935\u093e\u090f\u0901",
  "loc.current": "\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0938\u094d\u0925\u093e\u0928",
  "loc.change": "\u0938\u094d\u0925\u093e\u0928 \u092c\u0926\u0932\u0947\u0902",
  "state.loading": "\u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948\u2026",
  "state.loadingMarine": "\u0938\u092e\u0941\u0926\u094d\u0930\u0940 \u0938\u094d\u0925\u093f\u0924\u093f\u092f\u093e\u0901 \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u0940 \u0939\u0948\u0902\u2026",
  "footer.privacy": "\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e \u0928\u0940\u0924\u093f",
  "footer.terms": "\u0928\u093f\u092f\u092e \u090f\u0935\u0902 \u0936\u0930\u094d\u0924\u0947\u0902",
  "footer.rights": "\u092d\u093e\u0930\u0924 \u0915\u0947 \u0924\u091f\u0940\u092f \u0938\u092e\u0941\u0926\u093e\u092f\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f\u0964",
};

const gu: Dict = {
  "app.tagline": "\u0ab0\u0abe\u0ab7\u0acd\u0a9f\u0acd\u0ab0\u0ac0\u0aaf \u0aa4\u0a9f\u0ac0\u0aaf \u0ab8\u0ab2\u0abe\u0aae\u0aa4\u0ac0 \u0a85\u0aa8\u0ac7 \u0aa8\u0abf\u0ab0\u0acd\u0aa3\u0aaf \u0aac\u0ac1\u0aa6\u0acd\u0aa7\u0abf\u0aae\u0aa4\u0acd\u0aa4\u0abe \u0aaa\u0acd\u0ab2\u0ac7\u0a9f\u0aab\u0acb\u0ab0\u0acd\u0aae",
  "nav.dashboard": "\u0aa1\u0ac7\u0ab6\u0aac\u0acb\u0ab0\u0acd\u0aa1",
  "nav.map": "\u0aa8\u0a95\u0ab6\u0acb",
  "nav.alerts": "\u0a9a\u0ac7\u0aa4\u0ab5\u0aa3\u0ac0\u0a93",
  "nav.assistant": "\u0ab8\u0ab9\u0abe\u0aaf\u0a95",
  "nav.services": "\u0ab8\u0ac7\u0ab5\u0abe\u0a93",
  "nav.settings": "\u0ab8\u0ac7\u0a9f\u0abf\u0a82\u0a97\u0acd\u0ab8",
  "cta.getStarted": "\u0ab6\u0ab0\u0ac2 \u0a95\u0ab0\u0acb",
  "cta.continue": "\u0a86\u0a97\u0ab3 \u0ab5\u0aa7\u0acb",
  "cta.back": "\u0aaa\u0abe\u0a9b\u0ab3",
  "cta.signIn": "\u0ab8\u0abe\u0a87\u0aa8 \u0a87\u0aa8",
  "cta.register": "\u0a96\u0abe\u0aa4\u0ac1\u0a82 \u0aac\u0aa8\u0abe\u0ab5\u0acb",
  "cta.signOut": "\u0ab8\u0abe\u0a87\u0aa8 \u0a86\u0a89\u0a9f",
  "lang.title": "\u0aa4\u0aae\u0abe\u0ab0\u0ac0 \u0aad\u0abe\u0ab7\u0abe \u0aaa\u0ab8\u0a82\u0aa6 \u0a95\u0ab0\u0acb",
  "lang.subtitle": "\u0ab8\u0aae\u0a97\u0acd\u0ab0 \u0a8f\u0aaa\u0acd\u0ab2\u0abf\u0a95\u0ac7\u0ab6\u0aa8 \u0aa4\u0aae\u0ac7 \u0aaa\u0ab8\u0a82\u0aa6 \u0a95\u0ab0\u0ac7\u0ab2\u0ac0 \u0aad\u0abe\u0ab7\u0abe\u0aae\u0abe\u0a82 \u0aa6\u0ac7\u0a96\u0abe\u0ab6\u0ac7.",
  "status.title": "\u0ab5\u0ab0\u0acd\u0aa4\u0aae\u0abe\u0aa8 \u0ab8\u0ab2\u0abe\u0aae\u0aa4\u0ac0 \u0ab8\u0acd\u0aa5\u0abf\u0aa4\u0abf",
  "status.safe": "\u0a9c\u0ab5\u0ac1\u0a82 \u0ab8\u0ab2\u0abe\u0aae\u0aa4",
  "status.caution": "\u0ab8\u0abe\u0ab5\u0aa7\u0abe\u0aa8\u0ac0",
  "status.dangerous": "\u0a9c\u0acb\u0a96\u0aae\u0ac0",
  "status.emergency": "\u0a95\u0a9f\u0acb\u0a95\u0a9f\u0ac0",
  "marine.title": "\u0aa6\u0ab0\u0abf\u0aaf\u0abe\u0a88 \u0ab8\u0acd\u0aa5\u0abf\u0aa4\u0abf",
  "marine.wave": "\u0aae\u0acb\u0a9c\u0abe\u0aa8\u0ac0 \u0a8a\u0a82\u0a9a\u0abe\u0a88",
  "marine.wind": "\u0aaa\u0ab5\u0aa8\u0aa8\u0ac0 \u0a9d\u0aa1\u0aaa",
  "marine.visibility": "\u0aa6\u0ac3\u0ab6\u0acd\u0aaf\u0aa4\u0abe",
  "marine.sst": "\u0aa6\u0ab0\u0abf\u0aaf\u0abe\u0aa8\u0ac1\u0a82 \u0aa4\u0abe\u0aaa\u0aae\u0abe\u0aa8",
  "marine.weather": "\u0ab9\u0ab5\u0abe\u0aae\u0abe\u0aa8",
  "forecast.title": "\u0a86\u0a97\u0abe\u0aae\u0ac0 \u0a95\u0ab2\u0abe\u0a95\u0acb",
  "forecast.now": "\u0ab9\u0aae\u0aa3\u0abe\u0a82",
  "alerts.title": "\u0aa4\u0a9f\u0ac0\u0aaf \u0a9a\u0ac7\u0aa4\u0ab5\u0aa3\u0ac0\u0a93",
  "alerts.none": "\u0aa4\u0aae\u0abe\u0ab0\u0abe \u0ab5\u0abf\u0ab8\u0acd\u0aa4\u0abe\u0ab0 \u0aae\u0abe\u0a9f\u0ac7 \u0a95\u0acb\u0a88 \u0ab8\u0a95\u0acd\u0ab0\u0abf\u0aaf \u0ab8\u0ab2\u0abe\u0ab9 \u0aa8\u0aa5\u0ac0.",
  "map.title": "\u0aa4\u0aae\u0abe\u0ab0\u0acb \u0aa4\u0a9f\u0ac0\u0aaf \u0ab5\u0abf\u0ab8\u0acd\u0aa4\u0abe\u0ab0",
  "map.open": "\u0aa8\u0a95\u0ab6\u0acb \u0a96\u0acb\u0ab2\u0acb",
  "chat.title": "ORCA \u0aa8\u0ac7 \u0aaa\u0ac2\u0a9b\u0acb",
  "chat.placeholder": "\u0aa4\u0aae\u0abe\u0ab0\u0ac0 \u0aa4\u0a9f\u0ac0\u0aaf \u0ab8\u0ab2\u0abe\u0aae\u0aa4\u0ac0 \u0ab5\u0abf\u0ab6\u0ac7 \u0a95\u0a82\u0a88\u0aaa\u0aa3 \u0aaa\u0ac2\u0a9b\u0acb\u2026",
  "chat.send": "\u0aae\u0acb\u0a95\u0ab2\u0acb",
  "quick.title": "\u0a9d\u0aa1\u0aaa\u0ac0 \u0a95\u0acd\u0ab0\u0abf\u0aaf\u0abe\u0a93",
  "svc.title": "\u0a95\u0a9f\u0acb\u0a95\u0a9f\u0ac0 \u0a85\u0aa8\u0ac7 \u0ab8\u0ab0\u0a95\u0abe\u0ab0\u0ac0 \u0ab8\u0ac7\u0ab5\u0abe\u0a93",
  "loc.current": "\u0ab5\u0ab0\u0acd\u0aa4\u0aae\u0abe\u0aa8 \u0ab8\u0acd\u0aa5\u0abe\u0aa8",
  "loc.change": "\u0ab8\u0acd\u0aa5\u0abe\u0aa8 \u0aac\u0aa6\u0ab2\u0acb",
  "state.loading": "\u0ab2\u0acb\u0aa1 \u0aa5\u0abe\u0aaf \u0a9b\u0ac7\u2026",
  "footer.privacy": "\u0a97\u0acb\u0aaa\u0aa8\u0ac0\u0aaf\u0aa4\u0abe \u0aa8\u0ac0\u0aa4\u0abf",
  "footer.terms": "\u0aa8\u0abf\u0aaf\u0aae\u0acb \u0a85\u0aa8\u0ac7 \u0ab6\u0ab0\u0aa4\u0acb",
  "footer.rights": "\u0aad\u0abe\u0ab0\u0aa4\u0aa8\u0abe \u0aa4\u0a9f\u0ac0\u0aaf \u0ab8\u0aae\u0ac1\u0aa6\u0abe\u0aaf\u0acb \u0aae\u0abe\u0a9f\u0ac7.",
};

const DICTS: Record<LangCode, Dict> = {
  en, hi, gu,
  mr: { "nav.dashboard": "\u0921\u0945\u0936\u092c\u094b\u0930\u094d\u0921", "nav.map": "\u0928\u0915\u093e\u0936\u093e", "nav.alerts": "\u0907\u0936\u093e\u0930\u0947", "nav.assistant": "\u0938\u0939\u093e\u092f\u094d\u092f\u0915", "nav.services": "\u0938\u0947\u0935\u093e", "nav.settings": "\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u091c", "cta.getStarted": "\u0938\u0941\u0930\u0942 \u0915\u0930\u093e", "lang.title": "\u0924\u0941\u092e\u091a\u0940 \u092d\u093e\u0937\u093e \u0928\u093f\u0935\u0921\u093e", "status.title": "\u0938\u0927\u094d\u092f\u093e\u091a\u0940 \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u0938\u094d\u0925\u093f\u0924\u0940", "status.safe": "\u091c\u093e\u0923\u0947 \u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924", "status.caution": "\u0938\u093e\u0935\u0927\u093e\u0928\u0924\u093e", "status.dangerous": "\u0927\u094b\u0915\u093e\u0926\u093e\u092f\u0915", "marine.title": "\u0938\u093e\u0917\u0930\u0940 \u0938\u094d\u0925\u093f\u0924\u0940", "chat.title": "ORCA \u0932\u093e \u0935\u093f\u091a\u093e\u0930\u093e", "loc.current": "\u0938\u0927\u094d\u092f\u093e\u091a\u0947 \u0938\u094d\u0925\u093e\u0928", "loc.change": "\u0938\u094d\u0925\u093e\u0928 \u092c\u0926\u0932\u093e" },
  ta: { "nav.dashboard": "\u0b9f\u0bbe\u0bb7\u0bcd\u0baa\u0bcb\u0bb0\u0bcd\u0b9f\u0bc1", "nav.map": "\u0bb5\u0bb0\u0bc8\u0baa\u0b9f\u0bae\u0bcd", "nav.alerts": "\u0b8e\u0b9a\u0bcd\u0b9a\u0bb0\u0bbf\u0b95\u0bcd\u0b95\u0bc8\u0b95\u0bb3\u0bcd", "nav.assistant": "\u0b89\u0ba4\u0bb5\u0bbf\u0baf\u0bbe\u0bb3\u0bb0\u0bcd", "nav.services": "\u0b9a\u0bc7\u0bb5\u0bc8\u0b95\u0bb3\u0bcd", "cta.getStarted": "\u0ba4\u0bca\u0b9f\u0b99\u0bcd\u0b95\u0bc1", "lang.title": "\u0b89\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0bae\u0bca\u0bb4\u0bbf\u0baf\u0bc8\u0ba4\u0bcd \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd", "status.title": "\u0ba4\u0bb1\u0bcd\u0baa\u0bcb\u0ba4\u0bc8\u0baf \u0baa\u0bbe\u0ba4\u0bc1\u0b95\u0bbe\u0baa\u0bcd\u0baa\u0bc1 \u0ba8\u0bbf\u0bb2\u0bc8", "status.safe": "\u0b9a\u0bc6\u0bb2\u0bcd\u0bb2 \u0baa\u0bbe\u0ba4\u0bc1\u0b95\u0bbe\u0baa\u0bcd\u0baa\u0bbe\u0ba9\u0ba4\u0bc1", "status.caution": "\u0b8e\u0b9a\u0bcd\u0b9a\u0bb0\u0bbf\u0b95\u0bcd\u0b95\u0bc8", "marine.title": "\u0b95\u0b9f\u0bb2\u0bcd \u0ba8\u0bbf\u0bb2\u0bc8\u0bae\u0bc8\u0b95\u0bb3\u0bcd", "chat.title": "ORCA \u0bb5\u0bbf\u0b9f\u0bae\u0bcd \u0b95\u0bc7\u0bb3\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd", "chat.send": "\u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0bc1", "loc.current": "\u0ba4\u0bb1\u0bcd\u0baa\u0bcb\u0ba4\u0bc8\u0baf \u0b87\u0b9f\u0bae\u0bcd", "loc.change": "\u0b87\u0b9f\u0ba4\u0bcd\u0ba4\u0bc8 \u0bae\u0bbe\u0bb1\u0bcd\u0bb1\u0bc1" },
  te: { "nav.dashboard": "\u0c21\u0c3e\u0c37\u0c4d\u200c\u0c2c\u0c4b\u0c30\u0c4d\u0c21\u0c4d", "nav.map": "\u0c2e\u0c4d\u0c2f\u0c3e\u0c2a\u0c4d", "nav.alerts": "\u0c39\u0c46\u0c1a\u0c4d\u0c1a\u0c30\u0c3f\u0c15\u0c32\u0c41", "nav.assistant": "\u0c38\u0c39\u0c3e\u0c2f\u0c15\u0c41\u0c21\u0c41", "nav.services": "\u0c38\u0c47\u0c35\u0c32\u0c41", "cta.getStarted": "\u0c2a\u0c4d\u0c30\u0c3e\u0c30\u0c02\u0c2d\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f", "lang.title": "\u0c2e\u0c40 \u0c2d\u0c3e\u0c37\u0c28\u0c41 \u0c0e\u0c02\u0c1a\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f", "status.safe": "\u0c35\u0c46\u0c33\u0c4d\u0c33\u0c21\u0c02 \u0c38\u0c41\u0c30\u0c15\u0c4d\u0c37\u0c3f\u0c24\u0c02", "status.caution": "\u0c1c\u0c3e\u0c17\u0c4d\u0c30\u0c24\u0c4d\u0c24", "marine.title": "\u0c38\u0c2e\u0c41\u0c26\u0c4d\u0c30 \u0c2a\u0c30\u0c3f\u0c38\u0c4d\u0c25\u0c3f\u0c24\u0c41\u0c32\u0c41", "chat.title": "ORCA \u0c28\u0c41 \u0c05\u0c21\u0c17\u0c02\u0c21\u0c3f", "loc.current": "\u0c2a\u0c4d\u0c30\u0c38\u0c4d\u0c24\u0c41\u0c24 \u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c02", "loc.change": "\u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c02 \u0c2e\u0c3e\u0c30\u0c4d\u0c1a\u0c02\u0c21\u0c3f" },
  ml: { "nav.dashboard": "\u0d21\u0d3e\u0d37\u0d4d\u0d2c\u0d4b\u0d7c\u0d21\u0d4d", "nav.map": "\u0d2d\u0d42\u0d2a\u0d1f\u0d02", "nav.alerts": "\u0d2e\u0d41\u0d28\u0d4d\u0d28\u0d31\u0d3f\u0d2f\u0d3f\u0d2a\u0d4d\u0d2a\u0d41\u0d15\u0d7e", "nav.assistant": "\u0d38\u0d39\u0d3e\u0d2f\u0d3f", "nav.services": "\u0d38\u0d47\u0d35\u0d28\u0d19\u0d4d\u0d19\u0d7e", "cta.getStarted": "\u0d06\u0d30\u0d02\u0d2d\u0d3f\u0d15\u0d4d\u0d15\u0d41\u0d15", "lang.title": "\u0d28\u0d3f\u0d19\u0d4d\u0d19\u0d33\u0d41\u0d1f\u0d46 \u0d2d\u0d3e\u0d37 \u0d24\u0d3f\u0d30\u0d1e\u0d4d\u0d1e\u0d46\u0d1f\u0d41\u0d15\u0d4d\u0d15\u0d41\u0d15", "status.safe": "\u0d2a\u0d4b\u0d15\u0d3e\u0d7b \u0d38\u0d41\u0d30\u0d15\u0d4d\u0d37\u0d3f\u0d24\u0d02", "status.caution": "\u0d1c\u0d3e\u0d17\u0d4d\u0d30\u0d24", "marine.title": "\u0d38\u0d2e\u0d41\u0d26\u0d4d\u0d30 \u0d38\u0d3e\u0d39\u0d1a\u0d30\u0d4d\u0d2f\u0d19\u0d4d\u0d19\u0d7e", "chat.title": "ORCA \u0d2f\u0d4b\u0d1f\u0d4d \u0d1a\u0d4b\u0d26\u0d3f\u0d15\u0d4d\u0d15\u0d42", "loc.current": "\u0d28\u0d3f\u0d32\u0d35\u0d3f\u0d32\u0d46 \u0d38\u0d4d\u0d25\u0d32\u0d02", "loc.change": "\u0d38\u0d4d\u0d25\u0d32\u0d02 \u0d2e\u0d3e\u0d31\u0d4d\u0d31\u0d41\u0d15" },
  bn: { "nav.dashboard": "\u09a1\u09cd\u09af\u09be\u09b6\u09ac\u09cb\u09b0\u09cd\u09a1", "nav.map": "\u09ae\u09be\u09a8\u099a\u09bf\u09a4\u09cd\u09b0", "nav.alerts": "\u09b8\u09a4\u09b0\u09cd\u0995\u09a4\u09be", "nav.assistant": "\u09b8\u09b9\u09be\u09af\u09bc\u0995", "nav.services": "\u09b8\u09c7\u09ac\u09be", "cta.getStarted": "\u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8", "lang.title": "\u0986\u09aa\u09a8\u09be\u09b0 \u09ad\u09be\u09b7\u09be \u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8 \u0995\u09b0\u09c1\u09a8", "status.safe": "\u09af\u09be\u0993\u09af\u09bc\u09be \u09a8\u09bf\u09b0\u09be\u09aa\u09a6", "status.caution": "\u09b8\u09a4\u09b0\u09cd\u0995\u09a4\u09be", "marine.title": "\u09b8\u09be\u09ae\u09c1\u09a6\u09cd\u09b0\u09bf\u0995 \u0985\u09ac\u09b8\u09cd\u09a5\u09be", "chat.title": "ORCA \u0995\u09c7 \u099c\u09bf\u099c\u09cd\u099e\u09be\u09b8\u09be \u0995\u09b0\u09c1\u09a8", "loc.current": "\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8", "loc.change": "\u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8 \u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8" },
  kn: { "nav.dashboard": "\u0ca1\u0ccd\u0caf\u0cbe\u0cb6\u0ccd\u200c\u0cac\u0ccb\u0cb0\u0ccd\u0ca1\u0ccd", "nav.map": "\u0ca8\u0c95\u0ccd\u0cb7\u0cc6", "nav.alerts": "\u0c8e\u0c9a\u0ccd\u0c9a\u0cb0\u0cbf\u0c95\u0cc6\u0c97\u0cb3\u0cc1", "nav.assistant": "\u0cb8\u0cb9\u0cbe\u0caf\u0c95", "nav.services": "\u0cb8\u0cc7\u0cb5\u0cc6\u0c97\u0cb3\u0cc1", "cta.getStarted": "\u0caa\u0ccd\u0cb0\u0cbe\u0cb0\u0c82\u0cad\u0cbf\u0cb8\u0cbf", "lang.title": "\u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0cad\u0cbe\u0cb7\u0cc6\u0caf\u0ca8\u0ccd\u0ca8\u0cc1 \u0c86\u0caf\u0ccd\u0c95\u0cc6\u0cae\u0cbe\u0ca1\u0cbf", "status.safe": "\u0cb9\u0ccb\u0c97\u0cb2\u0cc1 \u0cb8\u0cc1\u0cb0\u0c95\u0ccd\u0cb7\u0cbf\u0ca4", "status.caution": "\u0c8e\u0c9a\u0ccd\u0c9a\u0cb0\u0cbf\u0c95\u0cc6", "marine.title": "\u0cb8\u0cae\u0cc1\u0ca6\u0ccd\u0cb0 \u0caa\u0cb0\u0cbf\u0cb8\u0ccd\u0ca5\u0cbf\u0ca4\u0cbf", "chat.title": "ORCA \u0caf\u0ca8\u0ccd\u0ca8\u0cc1 \u0c95\u0cc7\u0cb3\u0cbf", "loc.current": "\u0caa\u0ccd\u0cb0\u0cb8\u0ccd\u0ca4\u0cc1\u0ca4 \u0cb8\u0ccd\u0ca5\u0cb3", "loc.change": "\u0cb8\u0ccd\u0ca5\u0cb3 \u0cac\u0ca6\u0cb2\u0cbe\u0caf\u0cbf\u0cb8\u0cbf" },
  or: { "nav.dashboard": "\u0b21\u0b4d\u0b2f\u0b3e\u0b38\u0b2c\u0b4b\u0b30\u0b4d\u0b21", "nav.map": "\u0b2e\u0b3e\u0b28\u0b1a\u0b3f\u0b24\u0b4d\u0b30", "nav.alerts": "\u0b38\u0b24\u0b30\u0b4d\u0b15\u0b24\u0b3e", "nav.assistant": "\u0b38\u0b39\u0b3e\u0b5f\u0b15", "nav.services": "\u0b38\u0b47\u0b2c\u0b3e", "cta.getStarted": "\u0b06\u0b30\u0b2e\u0b4d\u0b2d \u0b15\u0b30\u0b28\u0b4d\u0b24\u0b41", "lang.title": "\u0b06\u0b2a\u0b23\u0b19\u0b4d\u0b15 \u0b2d\u0b3e\u0b37\u0b3e \u0b2c\u0b3e\u0b1b\u0b28\u0b4d\u0b24\u0b41", "status.safe": "\u0b2f\u0b3f\u0b2c\u0b3e \u0b38\u0b41\u0b30\u0b15\u0b4d\u0b37\u0b3f\u0b24", "status.caution": "\u0b38\u0b3e\u0b2c\u0b27\u0b3e\u0b28", "marine.title": "\u0b38\u0b3e\u0b2e\u0b41\u0b26\u0b4d\u0b30\u0b3f\u0b15 \u0b38\u0b4d\u0b25\u0b3f\u0b24\u0b3f", "chat.title": "ORCA \u0b15\u0b41 \u0b2a\u0b1a\u0b3e\u0b30\u0b28\u0b4d\u0b24\u0b41", "loc.current": "\u0b2c\u0b30\u0b4d\u0b24\u0b4d\u0b24\u0b2e\u0b3e\u0b28 \u0b38\u0b4d\u0b25\u0b3e\u0b28", "loc.change": "\u0b38\u0b4d\u0b25\u0b3e\u0b28 \u0b2c\u0b26\u0b33\u0b3e\u0b28\u0b4d\u0b24\u0b41" },
  pa: { "nav.dashboard": "\u0a21\u0a48\u0a36\u0a2c\u0a4b\u0a30\u0a21", "nav.map": "\u0a28\u0a15\u0a36\u0a3e", "nav.alerts": "\u0a1a\u0a47\u0a24\u0a3e\u0a35\u0a28\u0a40\u0a06\u0a02", "nav.assistant": "\u0a38\u0a39\u0a3e\u0a07\u0a15", "nav.services": "\u0a38\u0a47\u0a35\u0a3e\u0a35\u0a3e\u0a02", "cta.getStarted": "\u0a36\u0a41\u0a30\u0a42 \u0a15\u0a30\u0a4b", "lang.title": "\u0a06\u0a2a\u0a23\u0a40 \u0a2d\u0a3e\u0a36\u0a3e \u0a1a\u0a41\u0a23\u0a4b", "status.safe": "\u0a1c\u0a3e\u0a23\u0a3e \u0a38\u0a41\u0a30\u0a71\u0a16\u0a3f\u0a05\u0a24", "status.caution": "\u0a38\u0a3e\u0a35\u0a27\u0a3e\u0a28\u0a40", "marine.title": "\u0a38\u0a2e\u0a41\u0a70\u0a26\u0a30\u0a40 \u0a39\u0a3e\u0a32\u0a3e\u0a24", "chat.title": "ORCA \u0a28\u0a42\u0a70 \u0a2a\u0a41\u0a71\u0a1b\u0a4b", "loc.current": "\u0a2e\u0a4c\u0a1c\u0a42\u0a26\u0a3e \u0a1f\u0a3f\u0a15\u0a3e\u0a23\u0a3e", "loc.change": "\u0a1f\u0a3f\u0a15\u0a3e\u0a23\u0a3e \u0a2c\u0a26\u0a32\u0a4b" },
};

const STORAGE_KEY = "orca.lang";

type I18nValue = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: TKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
      if (stored && stored in DICTS) setLangState(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: TKey) => DICTS[lang]?.[key] ?? en[key] ?? (key as string),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
