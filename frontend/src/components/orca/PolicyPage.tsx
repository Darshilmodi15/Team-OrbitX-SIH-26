import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";
import { AppearanceMenu } from "./AppearanceMenu";
import { policyCopy } from "@/lib/orca/policy-copy";
import { LanguageMenu } from "./LanguageMenu";
import { OrcaWordmark } from "./Logo";
import { Footer } from "../Footer";
export function PolicyPage({kind}: {kind: "privacy" | "terms"}) {
 const {lang, t} = useI18n();
 return <div className="min-h-screen bg-background text-foreground flex flex-col" lang={lang}>
  <header className="border-b border-border"><div className="orca-container flex flex-wrap items-center justify-between gap-3 py-4"><Link to="/"><OrcaWordmark compact /></Link><div className="flex items-center gap-2"><LanguageMenu /><AppearanceMenu /></div></div></header>
  <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12"><h1 className="text-3xl font-semibold">{t(kind === "privacy" ? "footer.privacy" : "footer.terms")}</h1><div className="mt-8 space-y-6 leading-relaxed">{policyCopy[lang][kind].map((text,i)=><p key={i}>{text}</p>)}</div></main><Footer />
 </div>;
}
