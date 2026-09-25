import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { OrcaLogo } from "./Logo";
import { useI18n } from "@/lib/orca/i18n";

export function ServiceState({kind="backend",retry}:{kind?:"expired"|"backend"|"marine"|"ai";retry?:()=>void}) {
  const {pathname}=useLocation();
  const {lang,t}=useI18n();
  const [offline,setOffline]=useState(false);
  const expired=kind === "expired";
  const title=expired
    ? lang === "gu" ? "તમારું સત્ર સમાપ્ત થયું છે" : lang === "hi" ? "आपका सत्र समाप्त हो गया है" : "Your session has expired"
    : kind === "marine" ? "Marine data is temporarily unavailable" : kind === "ai" ? t("chat.providerUnavailable") : "ORCA is temporarily unavailable";
  return <section role="alert" className="mx-auto my-12 w-[min(92vw,32rem)] rounded-2xl border border-border bg-card p-8 text-foreground shadow-sm">
    <OrcaLogo className="mb-5 size-12"/>
    <h1 className="text-2xl font-semibold">{title}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{expired ? (lang === "gu" ? "સુરક્ષા માટે, કૃપા કરીને ફરી સાઇન ઇન કરો." : "For your security, please sign in again.") : "Live services couldn't be reached. Your saved information remains available where possible."}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      {expired ? <><Link className="rounded-lg bg-secondary px-5 py-3 text-secondary-foreground" to="/login" state={{from:pathname}}>{t("cta.signIn")}</Link><Link className="rounded-lg border px-5 py-3" to="/">Back to Home</Link></> : <><button className="rounded-lg bg-secondary px-5 py-3 text-secondary-foreground" onClick={retry}>{t("cta.retry")}</button><button className="rounded-lg border px-5 py-3" onClick={()=>setOffline(v=>!v)}>Open Offline Information</button></>}
    </div>
    {offline && <div className="mt-5 space-y-2 border-t pt-4 text-sm"><h2 className="font-semibold">Offline information</h2><p>Open a previously downloaded ORCA trip pack from your device's downloads. Check its saved time and expiry; it is not a live advisory.</p><p>Do not use an old forecast as departure clearance. Consult official local marine advisories.</p><Link className="underline" to="/">Back to Home</Link></div>}
  </section>;
}
