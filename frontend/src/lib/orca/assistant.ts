import { compassDirection, describeWeather } from "./marine";
import { EMERGENCY_SERVICES, GLOSSARY } from "./reference";
import type { LocationInfo, MarineBundle, SafetyLevel } from "./types";

/**
 * ORCA maritime assistant.
 *
 * Deterministic, on-device assistant: answers from live marine data
 * already loaded for the user's location plus verified reference data.
 * Never invents values. A hosted model can replace answerQuestion later.
 */

export type AssistantContext = {
  location: LocationInfo | null;
  bundle: MarineBundle | null;
  levelLabel: (l: SafetyLevel) => string;
};

const KEYWORDS = {
  safety: [
    "safe", "safety", "fishing", "go out", "\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924", "\u092e\u091b\u0932\u0940", "\u0938\u092e\u0941\u0926\u094d\u0930",
    "\u0ab8\u0ab2\u0abe\u0aae\u0aa4", "\u0aae\u0abe\u0a9b\u0ac0\u0aae\u0abe\u0ab0\u0ac0", "\u0aa6\u0ab0\u0abf\u0aaf\u0acb", "\u0baa\u0bbe\u0ba4\u0bc1\u0b95\u0bbe\u0baa\u0bcd\u0baa\u0bbe\u0ba9", "\u0bae\u0bc0\u0ba9\u0bcd", "\u09a8\u09bf\u09b0\u09be\u09aa\u09a6",
  ],
  wind: ["wind", "\u0939\u0935\u093e", "\u092a\u0935\u0928", "\u0aaa\u0ab5\u0aa8", "\u0b95\u0bbe\u0bb1\u0bcd\u0bb1\u0bc1", "\u09ac\u09be\u09a4\u09be\u09b8"],
  wave: ["wave", "swell", "\u0932\u0939\u0930", "\u092e\u094b\u091c\u093e", "\u0aae\u0acb\u0a9c\u0abe", "\u0b85\u0bb2\u0bc8", "\u09a2\u09c7\u0989"],
  weather: ["weather", "rain", "\u092e\u094c\u0938\u092e", "\u092c\u093e\u0930\u093f\u0936", "\u0ab9\u0ab5\u0abe\u0aae\u0abe\u0aa8", "\u0bb5\u0bbe\u0ba9\u0bbf\u0bb2\u0bc8", "\u0986\u09ac\u09b9\u09be\u0993\u09af\u09bc\u09be"],
  emergency: ["emergency", "sos", "help", "\u0906\u092a\u093e\u0924", "\u092e\u0926\u0926", "\u0a95\u0a9f\u0acb\u0a95\u0a9f\u0ac0", "\u0b85\u0bb5\u0b9a\u0bb0", "\u099c\u09b0\u09c1\u09b0\u09bf"],
  location: ["where", "location", "coast", "distance", "\u0938\u094d\u0925\u093e\u0928", "\u0926\u0942\u0930\u0940", "\u0ab8\u0acd\u0aa5\u0abe\u0aa8", "\u0b87\u0b9f\u0bae\u0bcd"],
  forecast: ["forecast", "later", "next", "tomorrow", "hours", "\u092a\u0942\u0930\u094d\u0935\u093e\u0928\u0941\u092e\u093e\u0928", "\u0906\u0917\u0947", "\u0a86\u0a97\u0abe\u0ab9\u0ac0"],
};

function has(text: string, list: string[]) {
  const t = text.toLowerCase();
  return list.some((k) => t.includes(k.toLowerCase()));
}

function conditionsLine(ctx: AssistantContext): string {
  const c = ctx.bundle?.current;
  if (!c) return "Live marine data is not loaded for your location yet.";
  const parts = [
    c.waveHeightM != null ? `waves ${c.waveHeightM.toFixed(1)} m` : null,
    c.windSpeedKmh != null
      ? `wind ${Math.round(c.windSpeedKmh)} km/h from ${compassDirection(c.windDirectionDeg)}`
      : null,
    c.visibilityKm != null ? `visibility ${c.visibilityKm} km` : null,
    c.seaTemperatureC != null ? `sea ${c.seaTemperatureC.toFixed(1)}\u00b0C` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export function answerQuestion(question: string, ctx: AssistantContext): string {
  const q = question.trim();
  if (!q) return "Please type your question.";

  const glossaryHit = GLOSSARY.find((g) => q.toLowerCase().includes(g.short.toLowerCase()));
  if (glossaryHit) {
    return `${glossaryHit.short} \u2014 ${glossaryHit.full}. ${glossaryHit.plain}`;
  }

  if (has(q, KEYWORDS.emergency)) {
    return [
      "For immediate help, call these verified numbers:",
      ...EMERGENCY_SERVICES.slice(0, 3).map((s) => `\u2022 ${s.name}: ${s.phone}`),
      "Share your exact location with the responder \u2014 you can copy it from the Services screen.",
    ].join("\n");
  }

  const current = ctx.bundle?.current;

  if (has(q, KEYWORDS.safety)) {
    if (!current) return "I cannot advise on safety until live marine data loads for your location.";
    const level = ctx.bundle!.forecast[0]?.level ?? "caution";
    const advice: Record<SafetyLevel, string> = {
      safe: "Conditions are within normal operational limits. Still carry safety gear and keep your radio on.",
      caution: "Conditions are changing \u2014 stay close to shore, tell someone your plan, and check again before leaving.",
      dangerous: "Conditions may be unsafe for marine activity. Postponing your trip is strongly advised.",
      emergency: "Do not go out. Immediate safety action may be required. Follow official instructions.",
    };
    return `${ctx.levelLabel(level)} \u2014 ${conditionsLine(ctx)}. ${advice[level]}`;
  }

  if (has(q, KEYWORDS.forecast)) {
    const pts = ctx.bundle?.forecast.slice(0, 7) ?? [];
    if (!pts.length) return "Forecast data is not available right now.";
    const lines = pts.map((p) => {
      const hour = new Date(p.time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return `\u2022 ${hour} \u2014 ${ctx.levelLabel(p.level)} (wave ${p.waveHeightM?.toFixed(1) ?? "\u2014"} m, wind ${
        p.windSpeedKmh != null ? Math.round(p.windSpeedKmh) : "\u2014"
      } km/h)`;
    });
    return ["Next hours at your location:", ...lines].join("\n");
  }

  if (has(q, KEYWORDS.wind) && current) {
    return current.windSpeedKmh != null
      ? `Wind is ${Math.round(current.windSpeedKmh)} km/h from the ${compassDirection(
          current.windDirectionDeg,
        )} at your location.`
      : "Wind data is temporarily unavailable.";
  }

  if (has(q, KEYWORDS.wave) && current) {
    return current.waveHeightM != null
      ? `Significant wave height is ${current.waveHeightM.toFixed(1)} m${
          current.wavePeriodS != null ? `, with a ${current.wavePeriodS.toFixed(0)} second period` : ""
        }.`
      : "Wave data is temporarily unavailable for this point.";
  }

  if (has(q, KEYWORDS.weather) && current) {
    return `Weather: ${describeWeather(current.weatherCode)}${
      current.airTemperatureC != null ? `, air ${current.airTemperatureC.toFixed(1)}\u00b0C` : ""
    }${current.visibilityKm != null ? `, visibility ${current.visibilityKm} km` : ""}.`;
  }

  if (has(q, KEYWORDS.location)) {
    const loc = ctx.location;
    if (!loc) return "Your location has not been set yet.";
    return `You are at ${loc.label ?? "your selected point"}, about ${loc.distanceToCoastKm} km from the nearest Indian coastline.`;
  }

  return [
    "I can help with coastal safety, marine conditions, forecasts, fishing-zone terms and emergency contacts.",
    current ? `Right now at your location: ${conditionsLine(ctx)}.` : "",
    'Try asking: \u201cIs it safe to go fishing today?\u201d, \u201cWhat is the wind speed right now?\u201d or \u201cWhat does PFZ mean?\u201d',
  ]
    .filter(Boolean)
    .join("\n\n");
}
