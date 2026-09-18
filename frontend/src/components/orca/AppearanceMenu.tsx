import { useEffect, useId, useRef, useState } from "react";
import { Monitor, Moon, Sun, Type } from "lucide-react";
import { useI18n } from "@/lib/orca/i18n";
import { TEXT_SIZES, useTheme } from "@/lib/orca/theme";

const textCopy = {
  en: ["Text size", "Smaller text", "Larger text", "Reset", "Preview: Read marine information comfortably."],
  hi: ["अक्षर का आकार", "छोटे अक्षर", "बड़े अक्षर", "रीसेट", "पूर्वावलोकन: समुद्री जानकारी आराम से पढ़ें।"],
  gu: ["લખાણનું કદ", "નાનું લખાણ", "મોટું લખાણ", "રીસેટ", "પૂર્વદર્શન: દરિયાઈ માહિતી આરામથી વાંચો."],
  mr: ["अक्षरांचा आकार", "लहान अक्षरे", "मोठी अक्षरे", "रीसेट", "पूर्वावलोकन: सागरी माहिती सहज वाचा."],
  ta: ["எழுத்து அளவு", "சிறிய எழுத்து", "பெரிய எழுத்து", "மீட்டமை", "முன்னோட்டம்: கடல் தகவல்களை எளிதாகப் படிக்கவும்."],
  te: ["అక్షరాల పరిమాణం", "చిన్న అక్షరాలు", "పెద్ద అక్షరాలు", "రీసెట్", "ముందస్తు వీక్షణ: సముద్ర సమాచారాన్ని సులభంగా చదవండి."],
  ml: ["അക്ഷര വലുപ്പം", "ചെറിയ അക്ഷരങ്ങൾ", "വലിയ അക്ഷരങ്ങൾ", "പുനഃക്രമീകരിക്കുക", "പ്രിവ്യൂ: സമുദ്ര വിവരങ്ങൾ എളുപ്പത്തിൽ വായിക്കുക."],
  bn: ["লেখার আকার", "ছোট লেখা", "বড় লেখা", "রিসেট", "পূর্বরূপ: সামুদ্রিক তথ্য সহজে পড়ুন।"],
  kn: ["ಅಕ್ಷರದ ಗಾತ್ರ", "ಸಣ್ಣ ಅಕ್ಷರಗಳು", "ದೊಡ್ಡ ಅಕ್ಷರಗಳು", "ಮರುಹೊಂದಿಸಿ", "ಮುನ್ನೋಟ: ಸಮುದ್ರ ಮಾಹಿತಿಯನ್ನು ಸುಲಭವಾಗಿ ಓದಿ."],
  or: ["ଅକ୍ଷର ଆକାର", "ଛୋଟ ଅକ୍ଷର", "ବଡ଼ ଅକ୍ଷର", "ପୁନଃସେଟ୍", "ପୂର୍ବାବଲୋକନ: ସାମୁଦ୍ରିକ ତଥ୍ୟ ସହଜରେ ପଢ଼ନ୍ତୁ।"],
  pa: ["ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ", "ਛੋਟੇ ਅੱਖਰ", "ਵੱਡੇ ਅੱਖਰ", "ਰੀਸੈੱਟ", "ਝਲਕ: ਸਮੁੰਦਰੀ ਜਾਣਕਾਰੀ ਆਰਾਮ ਨਾਲ ਪੜ੍ਹੋ।"],
};

export function AppearanceControls() {
  const { t, lang } = useI18n();
  const { theme, setTheme, textSize, setTextSize } = useTheme();
  const copy = textCopy[lang];
  const index = TEXT_SIZES.findIndex(size => size === textSize);
  return <div className="space-y-4 text-foreground">
    <div role="group" aria-label={t("theme.title")} className="grid grid-cols-3 gap-2">
      {([ ["light", Sun], ["dark", Moon], ["system", Monitor] ] as const).map(([value, Icon]) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs ${theme === value ? "border-secondary bg-secondary/15 font-bold" : "border-border bg-card hover:bg-muted"}`}>
        <Icon className="size-4" aria-hidden /><span>{t(`theme.${value}`)}</span>
      </button>)}
    </div>
    <div className="border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{copy[0]}</span><output aria-live="polite" className="text-sm">{textSize}%</output></div>
      <div role="group" aria-label={copy[0]} className="mt-2 flex items-center gap-2">
        <button type="button" aria-label={copy[1]} disabled={index === 0} onClick={() => setTextSize(TEXT_SIZES[index - 1]!)} className="min-h-11 flex-1 rounded-lg border border-border bg-card text-sm hover:bg-muted disabled:opacity-40">A−</button>
        <button type="button" onClick={() => setTextSize(100)} className="min-h-11 flex-1 rounded-lg border border-border bg-card px-2 text-xs hover:bg-muted">{copy[3]}</button>
        <button type="button" aria-label={copy[2]} disabled={index === TEXT_SIZES.length - 1} onClick={() => setTextSize(TEXT_SIZES[index + 1]!)} className="min-h-11 flex-1 rounded-lg border border-border bg-card text-sm hover:bg-muted disabled:opacity-40">A+</button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy[4]}</p>
    </div>
  </div>;
}

export function AppearanceMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return <div ref={ref} className="relative shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} data-appearance-trigger type="button" className="inline-flex size-11 items-center justify-center rounded-md text-foreground hover:bg-muted" aria-label={t("theme.title")} title={t("theme.title")} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}><Type className="size-5" aria-hidden /></button>
    {open && <section id={id} aria-label={t("theme.title")} className="appearance-panel absolute right-0 top-full z-50 mt-2 max-h-[70dvh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl">
      <h2 className="mb-3 text-sm font-semibold">{t("theme.title")}</h2><AppearanceControls />
    </section>}
  </div>;
}
