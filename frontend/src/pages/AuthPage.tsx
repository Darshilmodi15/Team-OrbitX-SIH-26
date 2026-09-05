import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, User, Phone, ShieldCheck } from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/orca/analytics";

interface FieldErrors {
  name?: string;
  contact?: string;
  password?: string;
  confirm?: string;
}

export default function AuthPage() {
  const { lang, t } = useI18n();
  const { signIn, register } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [form, setForm] = useState({ name: "", contact: "", password: "", confirm: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (fieldErrors[k]) {
      setFieldErrors((prev) => ({ ...prev, [k]: undefined }));
    }
    setGeneralError(null);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const contact = form.contact.trim();

    if (!contact) {
      errors.contact = "Please enter your mobile number or email address.";
    } else {
      const validPhone = /^\+?\d{10,13}$/.test(contact);
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      if (!validPhone && !validEmail) {
        errors.contact = "Enter a valid mobile number or email address.";
      }
    }

    if (!form.password) {
      errors.password = "Password is required.";
    } else if (form.password.length < 6) {
      errors.password = "Password must be at least 6 characters in length.";
    }

    if (mode === "register") {
      if (!form.name.trim()) {
        errors.name = "Please enter your full name or vessel master name.";
      }
      if (form.password !== form.confirm) {
        errors.confirm = "Passwords do not match.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const contact = form.contact.trim();
      if (mode === "register") {
        await register({
          contact,
          password: form.password,
          name: form.name || "Marine Fisher",
          preferredLanguage: lang || "en",
          remember,
        });
      } else {
        await signIn({
          contact,
          password: form.password,
          remember,
        });
      }
      trackEvent("user_auth_success", { mode, contactType: contact.includes("@") ? "email" : "mobile_nmfd" });
      navigate("/location");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed. Please verify credentials and retry.";
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 selection:bg-teal-500/30">
      <SEO
        title={mode === "signin" ? "Fisher & Vessel Login | ORCA Marine AI" : "Register Vessel & Fisher Profile | ORCA Marine AI"}
        description="Authenticate your maritime profile via National Marine Fisher ID (NMFD), mobile number, or satellite credentials."
      />

      <div className="flex items-center gap-3">
        <OrcaLogo className="size-10" />
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold block">
            Secure Marine Intelligence Access
          </span>
          <span className="text-base font-bold text-foreground">ORCA Marine AI</span>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
        {mode === "signin" ? t("auth.title") : t("auth.registerTitle")}
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
        {t("auth.subtitle")}
      </p>

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-400 animate-in fade-in"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode === "register" && (
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>{t("auth.name")}</span>
              {fieldErrors.name && (
                <span className="text-[11px] font-normal text-rose-500 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {fieldErrors.name}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="name"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
                placeholder="e.g. Master Captain Ramesh Kumar"
                aria-invalid={!!fieldErrors.name}
                className={`flex h-11 w-full rounded-lg border bg-background px-3.5 pl-10 text-sm outline-none transition-colors ${
                  fieldErrors.name
                    ? "border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-input hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                }`}
              />
              <User className="absolute left-3 top-3.5 size-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="contact" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{t("auth.mobile")} / {t("auth.email")}</span>
            {fieldErrors.contact && (
              <span className="text-[11px] font-normal text-rose-500 flex items-center gap-1">
                <AlertCircle className="size-3" />
                {fieldErrors.contact}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="contact"
              value={form.contact}
              onChange={set("contact")}
              inputMode="text"
              autoComplete="username"
              required
              placeholder="e.g. 9876543210 or fisher@example.com"
              aria-invalid={!!fieldErrors.contact}
              className={`flex h-11 w-full rounded-lg border bg-background px-3.5 pl-10 pr-11 text-sm outline-none transition-colors ${
                fieldErrors.contact
                  ? "border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  : "border-input hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              }`}
            />
            <Phone className="absolute left-3 top-3.5 size-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-[11px] text-muted-foreground">Official Fisher ID verification will only be enabled after a verified government integration is available.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{t("auth.password")}</span>
            {fieldErrors.password && (
              <span className="text-[11px] font-normal text-rose-500 flex items-center gap-1">
                <AlertCircle className="size-3" />
                {fieldErrors.password}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              placeholder="••••••••"
              aria-invalid={!!fieldErrors.password}
              className={`flex h-11 w-full rounded-lg border bg-background px-3.5 pl-10 text-sm outline-none transition-colors ${
                fieldErrors.password
                  ? "border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  : "border-input hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              }`}
            />
            <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground pointer-events-none" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-0 top-0 grid size-11 place-items-center text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {mode === "register" && (
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>{t("auth.confirm")}</span>
              {fieldErrors.confirm && (
                <span className="text-[11px] font-normal text-rose-500 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  {fieldErrors.confirm}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="confirm"
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                aria-invalid={!!fieldErrors.confirm}
                className={`flex h-11 w-full rounded-lg border bg-background px-3.5 pl-10 pr-11 text-sm outline-none transition-colors ${
                  fieldErrors.confirm
                    ? "border-rose-500 bg-rose-500/5 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-input hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                }`}
              />
              <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />Remember me</label>
          <span className="text-muted-foreground" title="Password recovery is not configured yet">Password recovery unavailable</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-500 text-sm font-bold text-slate-950 shadow-md shadow-teal-950/20 transition-all hover:bg-teal-400 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>{mode === "signin" ? t("cta.signIn") : t("cta.register")}</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <button
          type="button"
          className="font-bold text-teal-500 dark:text-teal-400 underline-offset-2 hover:underline"
          onClick={() => {
            setMode(mode === "signin" ? "register" : "signin");
            setFieldErrors({});
            setGeneralError(null);
          }}
        >
          {mode === "signin" ? t("cta.register") : t("cta.signIn")}
        </button>
      </p>

      <div className="mt-8 border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3.5" />AI-powered ocean safety, fishing intelligence and maritime decision support.</p>
        <div className="mt-2 flex justify-center gap-4 text-slate-400">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
