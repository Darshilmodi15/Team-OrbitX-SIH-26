import { Link, useNavigate } from "react-router-dom";
import { Laptop, Moon, Sun } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { useTheme } from "@/lib/orca/theme";
import { formatCoords } from "@/lib/orca/geo";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, location, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <AppShell>
      <h1 className="text-xl font-semibold text-foreground">{t("nav.settings")}</h1>

      {/* Theme Settings Section */}
      <section className="mt-4 rounded-md border border-border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground">{t("theme.title")}</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer",
              theme === "light"
                ? "border-secondary bg-secondary/20 text-secondary font-bold"
                : "bg-card text-foreground hover:text-foreground"
            )}
          >
            <Sun className="size-4" aria-hidden />
            <span>{t("theme.light")}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer",
              theme === "dark"
                ? "border-secondary bg-secondary/20 text-secondary font-bold"
                : "bg-card text-foreground hover:text-foreground"
            )}
          >
            <Moon className="size-4" aria-hidden />
            <span>{t("theme.dark")}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            aria-pressed={theme === "system"}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer",
              theme === "system"
                ? "border-secondary bg-secondary/20 text-secondary font-bold"
                : "bg-card text-foreground hover:text-foreground"
            )}
          >
            <Laptop className="size-4" aria-hidden />
            <span>{t("theme.system")}</span>
          </button>
        </div>
      </section>

      {/* Location Section */}
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

      {/* User / Account Section */}
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

      {/* Footer Links */}
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
