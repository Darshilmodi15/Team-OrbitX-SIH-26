import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { OrcaLogo } from "@/components/orca/Logo";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";

export default function AuthPage() {
  const { t } = useI18n();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [form, setForm] = useState({ name: "", contact: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const contact = form.contact.trim();
    const valid = /^\+?\d{10,13}$/.test(contact) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    if (!valid || form.password.length < 6) return setError(t("auth.invalid"));
    if (mode === "register" && form.password !== form.confirm) return setError(t("auth.mismatch"));

    signIn({ contact, name: form.name });
    navigate("/location");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <OrcaLogo className="size-9" />
      <h1 className="mt-5 text-2xl font-semibold">
        {mode === "signin" ? t("auth.title") : t("auth.registerTitle")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode === "register" && (
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">{t("auth.name")}</label>
            <input
              id="name" value={form.name} onChange={set("name")} autoComplete="name"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="contact" className="text-sm font-medium">
            {t("auth.mobile")} / {t("auth.email")}
          </label>
          <input
            id="contact" value={form.contact} onChange={set("contact")} inputMode="text"
            autoComplete="username" required
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">{t("auth.password")}</label>
          <input
            id="password" type="password" value={form.password} onChange={set("password")}
            autoComplete={mode === "signin" ? "current-password" : "new-password"} required
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        {mode === "register" && (
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-sm font-medium">{t("auth.confirm")}</label>
            <input
              id="confirm" type="password" value={form.confirm} onChange={set("confirm")}
              autoComplete="new-password" required
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger-surface p-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-110">
          {mode === "signin" ? t("cta.signIn") : t("cta.register")}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <button
          type="button"
          className="font-medium text-secondary underline-offset-2 hover:underline"
          onClick={() => setMode(mode === "signin" ? "register" : "signin")}
        >
          {mode === "signin" ? t("cta.register") : t("cta.signIn")}
        </button>
      </p>

      <p className="mt-6 text-center text-xs text-muted-foreground">{t("auth.localNotice")}</p>
    </div>
  );
}
