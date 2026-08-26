import { Link } from "react-router-dom";
import { Anchor, CloudSun, MessageSquare, ShieldCheck } from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { useI18n } from "@/lib/orca/i18n";

const FEATURES = [
  { key: "land.f1" as const, desc: "land.f1d" as const, Icon: ShieldCheck },
  { key: "land.f2" as const, desc: "land.f2d" as const, Icon: CloudSun },
  { key: "land.f3" as const, desc: "land.f3d" as const, Icon: Anchor },
  { key: "land.f4" as const, desc: "land.f4d" as const, Icon: MessageSquare },
];

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary px-4 py-20 text-primary-foreground md:py-28">
        <div className="absolute inset-0 -z-10 opacity-20">
          <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0,200 Q200,80 400,200 T800,200 V400 H0Z" fill="currentColor" opacity="0.15" />
            <path d="M0,240 Q200,140 400,240 T800,240 V400 H0Z" fill="currentColor" opacity="0.1" />
          </svg>
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <OrcaLogo className="mx-auto size-16" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
            {t("app.name")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/80 md:text-lg">
            {t("app.tagline")}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/60">
            {t("app.desc")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/language"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-secondary px-8 text-sm font-semibold text-secondary-foreground shadow-lg transition hover:brightness-110"
            >
              {t("cta.getStarted")}
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary-foreground/30 px-8 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              {t("cta.explore")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="orca-container py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, desc, Icon }) => (
            <article
              key={key}
              className="rounded-md border border-border bg-card p-5 transition hover:shadow-md"
            >
              <Icon className="size-7 text-secondary" aria-hidden />
              <h3 className="mt-3 text-sm font-semibold">{t(key)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(desc)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted-foreground">
        <div className="orca-container flex flex-wrap items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
          <Link to="/terms" className="hover:text-foreground">{t("footer.terms")}</Link>
          <span>{t("footer.rights")}</span>
        </div>
      </footer>
    </div>
  );
}
