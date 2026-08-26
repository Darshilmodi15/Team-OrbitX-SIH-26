import { Link, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { LANGUAGES, useI18n } from "@/lib/orca/i18n";
import { cn } from "@/lib/utils";

export default function LanguagePage() {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8">
      <OrcaLogo className="size-9" />
      <h1 className="mt-5 text-2xl font-semibold">{t("lang.title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("lang.subtitle")}</p>

      <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LANGUAGES.map((l) => (
          <li key={l.code}>
            <button
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={l.code === lang}
              className={cn(
                "flex min-h-16 w-full flex-col items-start justify-center gap-0.5 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted",
                l.code === lang && "border-secondary bg-secondary/10",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{l.native}</span>
                {l.code === lang && <Check className="size-4 shrink-0 text-secondary" aria-hidden />}
              </span>
              <span className="truncate text-xs text-muted-foreground">{l.english}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <button
          className="flex min-h-12 flex-1 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-110"
          onClick={() => navigate("/auth")}
        >
          {t("cta.continue")}
        </button>
        <Link
          to="/"
          className="flex min-h-12 items-center justify-center rounded-md px-6 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          {t("cta.back")}
        </Link>
      </div>
    </div>
  );
}
