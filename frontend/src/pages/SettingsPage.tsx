import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/orca/AppShell";
import { ThemeToggle } from "@/components/orca/ThemeToggle";
import { LANGUAGES, useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { formatCoords } from "@/lib/orca/geo";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { user, location, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <AppShell>
      <h1 className="text-xl font-semibold text-foreground">{t("nav.settings")}</h1>

      {/* Theme Settings Section */}
      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground mb-1">Theme (Day / Night Mode)</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Choose between Moonlit Night (Dark), Coastal Daylight (Light), or match System settings.
        </p>
        <ThemeToggle variant="pills" />
      </section>

      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{t("lang.title")}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={l.code === lang}
                className={cn(
                  "min-h-11 w-full cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted shadow-xs",
                  l.code === lang
                    ? "border-secondary bg-secondary/20 text-secondary font-bold"
                    : "bg-card text-foreground hover:text-foreground",
                )}
              >
                {l.native}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{t("loc.current")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {location ? (location.label ?? formatCoords(location.coords)) : t("loc.title")}
        </p>
        <Link
          to="/location"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs"
        >
          {t("loc.change")}
        </Link>
      </section>

      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{user?.name || user?.contact || t("auth.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("auth.localNotice")}</p>
        <button
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs"
          onClick={() => {
            signOut();
            navigate("/");
          }}
        >
          {t("cta.signOut")}
        </button>
      </section>

      <p className="mt-6 flex gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          {t("footer.privacy")}
        </Link>
        <Link to="/terms" className="hover:text-foreground">
          {t("footer.terms")}
        </Link>
      </p>
    </AppShell>
  );
}
