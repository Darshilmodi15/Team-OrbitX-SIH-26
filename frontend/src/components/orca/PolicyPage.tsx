import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";
import { AppearanceMenu } from "./AppearanceMenu";
import { policyCopy } from "@/lib/orca/policy-copy";
import { LanguageMenu } from "./LanguageMenu";
import { MatsyaWordmark } from "./Logo";
import { Footer } from "../Footer";
const SUPPORT_EMAIL = "support@matsya.app";

function renderPolicyParagraph(text: string) {
 if (!text.includes(SUPPORT_EMAIL)) return text;
 const parts = text.split(SUPPORT_EMAIL);
 return parts.flatMap((part, idx) =>
  idx < parts.length - 1
   ? [part, <a key={idx} href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-secondary underline underline-offset-2 hover:brightness-110">{SUPPORT_EMAIL}</a>]
   : [part],
 );
}

export function PolicyPage({kind}: {kind: "privacy" | "terms"}) {
 const {lang, t} = useI18n();
 return <div className="min-h-screen bg-background text-foreground flex flex-col" lang={lang}>
  <header className="border-b border-border"><div className="orca-container flex flex-wrap items-center justify-between gap-3 py-4"><Link to="/"><MatsyaWordmark compact /></Link><div className="flex items-center gap-2"><LanguageMenu /><AppearanceMenu /></div></div></header>
  <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12"><h1 className="text-3xl font-semibold">{t(kind === "privacy" ? "footer.privacy" : "footer.terms")}</h1><div className="mt-8 space-y-6 leading-relaxed">{policyCopy[lang][kind].map((text,i)=><p key={i}>{renderPolicyParagraph(text)}</p>)}</div></main><Footer />
 </div>;
}
