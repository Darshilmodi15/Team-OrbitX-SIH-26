import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  LayoutDashboard,
  LifeBuoy,
  Map as MapIcon,
  MessageSquare,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { OrcaWordmark } from "./Logo";
import { LanguageMenu } from "./LanguageMenu";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "nav.dashboard" as const, Icon: LayoutDashboard },
  { to: "/map", key: "nav.map" as const, Icon: MapIcon },
  { to: "/assistant", key: "nav.assistant" as const, Icon: MessageSquare },
  { to: "/alerts", key: "nav.alerts" as const, Icon: Bell },
  { to: "/services", key: "nav.services" as const, Icon: LifeBuoy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { location } = useSession();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-teal-500/30">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="orca-container flex h-14 items-center justify-between gap-3">
          <Link to="/dashboard" className="min-w-0 flex-1">
            <OrcaWordmark compact />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map(({ to, key, Icon }) => {
              const isActive = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-teal-500/15 text-teal-400 font-bold border border-teal-500/30 shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", isActive ? "text-teal-400" : "text-muted-foreground")} aria-hidden />
                  <span className={isActive ? "text-teal-400 font-bold" : "text-foreground"}>{t(key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <LanguageMenu />
            <Link
              to="/settings"
              aria-label={t("nav.settings")}
              className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
        {location?.label && (
          <div className="border-t border-border bg-surface text-surface-foreground">
            <div className="orca-container flex h-9 items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-foreground">{location.label}</span>
              <Link to="/location" className="shrink-0 font-bold text-teal-400 hover:text-teal-300 underline-offset-2 hover:underline">
                {t("loc.change")}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="orca-container w-full flex-1 py-4 pb-24 lg:pb-8">{children}</main>

      {/* Official Footnote / Contact info on desktop & mobile */}
      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md lg:hidden"
        aria-label="Primary mobile"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, key, Icon }) => {
            const isActive = pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                    isActive ? "text-teal-400 font-bold" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-5", isActive ? "text-teal-400" : "text-muted-foreground")} aria-hidden />
                  <span className={cn("w-full truncate text-center", isActive ? "text-teal-400 font-bold" : "text-foreground")}>{t(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
