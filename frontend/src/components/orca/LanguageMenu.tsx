import { Languages, Check, ChevronDown } from "lucide-react";
import { LANGUAGES, useI18n } from "@/lib/orca/i18n";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function LanguageMenu() {
  const { lang, setLang, t } = useI18n();
  const active = LANGUAGES.find((l) => l.code === lang);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("lang.title")}
      >
        <Languages className="size-5 text-secondary" aria-hidden />
        <span className="hidden max-w-24 truncate text-sm font-medium text-foreground sm:inline">{active?.native}</span>
        <ChevronDown className="size-3.5" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-52 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-xl">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className={cn("truncate font-medium", l.code === lang ? "text-secondary font-bold" : "text-foreground")}>
                {l.native}
              </span>
              {l.code === lang && <Check className="size-4 shrink-0 text-secondary" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
