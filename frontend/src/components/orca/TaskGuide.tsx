import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";
import { guideCopy } from "@/lib/orca/guide-copy";
const KEY = "orca.guide.v1";
const routes = ["/location", "/dashboard", "/map", "/dashboard", "/assistant"];
const titles = ["loc.title", "marine.title", "nav.map", "nav.dashboard", "nav.assistant"] as const;
function initial() {
  try { const value = Number(sessionStorage.getItem(KEY)); return Number.isInteger(value) && value >= 0 && value <= 5 ? value : 0; } catch { return 0; }
}
export function TaskGuide() {
  const { lang, t } = useI18n();
  const copy = guideCopy[lang];
  const [step, setStep] = useState(initial);
  const heading = useRef<HTMLHeadingElement>(null);
  function change(next: number) {
    setStep(next);
    try { sessionStorage.setItem(KEY, String(next)); } catch { /* Guide works without storage. */ }
    heading.current?.focus();
  }
  return <section className="mb-4 rounded-md border border-border bg-card p-3 text-sm" aria-label={copy.title}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 ref={heading} tabIndex={-1} className="font-semibold">{copy.title}{step < 5 ? ` · ${step + 1}/5` : ""}</h2>
      <button type="button" className="min-h-11 rounded-md border px-3" onClick={() => change(step < 5 ? 5 : 0)}>{step < 5 ? copy.close : copy.replay}</button>
    </div>
    {step < 5 && <div className="space-y-3">
      <h3 className="font-medium">{t(titles[step])}</h3>
      <p aria-live="polite">{copy.steps[step]}</p>
      <div className="flex flex-wrap gap-2">
        <Link to={routes[step]} className="inline-flex min-h-11 items-center rounded-md border px-3 underline">{copy.open}</Link>
        {step > 0 && <button type="button" onClick={() => change(step - 1)} className="min-h-11 rounded-md border px-3">{copy.back}</button>}
        <button type="button" onClick={() => change(step + 1)} className="min-h-11 rounded-md bg-secondary px-3 text-secondary-foreground">{step === 4 ? copy.done : copy.next}</button>
      </div>
    </div>}
  </section>;
}
