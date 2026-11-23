import { useNavigate, useLocation, Link } from "react-router-dom";
import { useRef, useState } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import { LanguageMenu } from "@/components/orca/LanguageMenu";
import { AppearanceMenu } from "@/components/orca/AppearanceMenu";
import "@/components/orca/public-pages.css";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/orca/analytics";
import { confirmPasswordReset, requestPasswordReset } from "@/services/api";

interface FieldErrors {
  name?: string;
  contact?: string;
  password?: string;
  confirm?: string;
  resetToken?: string;
}

export default function AuthPage() {
  const { lang, t } = useI18n();
  const { signIn, signInGoogle, register } = useSession();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [mode, setMode] = useState<"signin" | "register" | "reset">("signin");
  const [form, setForm] = useState({
    name: "",
    contact: "",
    password: "",
    confirm: "",
    resetToken: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const clearErrors = () => {
    setGoogleError(null);
    setLoginError(null);
    setResetStatus(null);
  };

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      if (fieldErrors[k]) {
        setFieldErrors((prev) => ({ ...prev, [k]: undefined }));
      }
      setLoginError(null);
      setGoogleError(null);
    };

  const resolvePostAuthTarget = (navState: unknown): string => {
    const rawFrom =
      navState && typeof navState === "object" && "from" in navState
        ? (navState as { from?: unknown }).from
        : null;
    return typeof rawFrom === "string" &&
      /^(?:\/(?:dashboard|map|assistant|location|alerts|services|settings|operations|admin|officer)|\/assistant\/c\/[0-9a-f-]{36})$/i.test(
        rawFrom,
      )
      ? rawFrom
      : "/location";
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const contact = form.contact.trim();

    if (!contact) {
      errors.contact = "Please enter your mobile number or email address.";
    } else {
      const normalizedPhone = contact.includes("@") ? contact : contact.replace(/[\s()-]/g, "");
      const validPhone = /^\+?\d{10,13}$/.test(normalizedPhone);
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

  async function submitGoogle(credential: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    clearErrors();
    try {
      await signInGoogle(credential, remember, lang);
      navigate(resolvePostAuthTarget(state), { replace: true });
    } catch (error) {
      setGoogleError(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please retry.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    clearErrors();

    if (!validate()) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const rawContact = form.contact.trim();
      const contact = rawContact.includes("@") ? rawContact : rawContact.replace(/[\s()-]/g, "");
      if (mode === "register") {
        await register({
          contact,
          password: form.password,
          name: form.name.trim() || "Marine Fisher",
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
      trackEvent("user_auth_success", {
        mode,
        contactType: contact.includes("@") ? "email" : "mobile_nmfd",
      });
      navigate(resolvePostAuthTarget(state), { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify credentials and retry.";
      setLoginError(msg);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    clearErrors();
    const rawContact = form.contact.trim();
    const contact = rawContact.includes("@") ? rawContact : rawContact.replace(/[\s()-]/g, "");
    if (resetStep === "request") {
      if (!contact) {
        setFieldErrors({ contact: "Enter your registered email or mobile number." });
        return;
      }
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        const res = await requestPasswordReset(contact);
        setResetStatus(res?.message || "Reset instructions sent if account exists.");
        setResetStep("confirm");
      } catch (err: unknown) {
        const msg =
          err instanceof Error && (err as { code?: string }).code === "PASSWORD_RESET_DELIVERY_UNCONFIGURED"
            ? "Password reset delivery (SMTP / SMS) is not configured on this server yet."
            : err instanceof Error
              ? err.message
              : "Could not start password reset.";
        setLoginError(msg);
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
      return;
    }

    if (!form.resetToken.trim()) {
      setLoginError("Enter the reset code sent to your email or phone.");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setFieldErrors({ password: "Password must be at least 6 characters in length." });
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(form.resetToken.trim(), form.password);
      setMode("signin");
      setResetStep("request");
      setForm((f) => ({ ...f, resetToken: "", password: "" }));
      setResetStatus("Password updated. Please sign in with your new password.");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <SEO
            title={
              mode === "signin"
                ? "Fisher & Vessel Login | ORCA Marine AI"
                : "Register Vessel & Fisher Profile | ORCA Marine AI"
            }
            description="Sign in to your ORCA account using your email or mobile number and password."
          />

          {/* Back to Home Navigation */}
          <div className="auth-back-row">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-teal-400 group"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to home</span>
            </Link>
            <div className="flex items-center gap-1"><LanguageMenu /><AppearanceMenu /></div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="ORCA Home"
              className="transition-transform hover:scale-105"
            >
              <OrcaLogo className="size-10" />
            </Link>
            <Link to="/" className="group block">
              <span className="text-xs font-mono uppercase tracking-widest text-teal-700 dark:text-teal-300 font-semibold block">
                ORCA · Marine intelligence
              </span>
              <span className="text-base font-bold text-foreground group-hover:text-teal-400 transition-colors">
                ORCA Marine AI
              </span>
            </Link>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            {mode === "signin" ? t("auth.title") : mode === "register" ? t("auth.registerTitle") : "Reset your ORCA password"}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            {t("auth.subtitle")}
          </p>

          {resetStatus && (
            <p role="status" className="mt-4 rounded-lg border border-teal-500/40 bg-teal-500/10 p-3 text-xs text-teal-600 dark:text-teal-300">
              {resetStatus}
            </p>
          )}

          {mode === "reset" ? (
            <form onSubmit={submitReset} className="mt-6 space-y-4" noValidate>
              {resetStep === "request" ? (
                <div className="space-y-1.5">
                  <label htmlFor="reset-contact" className="text-xs font-semibold text-foreground">
                    {t("auth.mobile")} / {t("auth.email")}
                  </label>
                  <input
                    id="reset-contact"
                    value={form.contact}
                    onChange={set("contact")}
                    placeholder="e.g. 9876543210 or fisher@example.com"
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="reset-token" className="text-xs font-semibold text-foreground">
                      Reset code
                    </label>
                    <input
                      id="reset-token"
                      value={form.resetToken}
                      onChange={set("resetToken")}
                      placeholder="Paste single-use reset code"
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="reset-password" className="text-xs font-semibold text-foreground">
                      New password
                    </label>
                    <input
                      id="reset-password"
                      type="password"
                      value={form.password}
                      onChange={set("password")}
                      placeholder="At least 6 characters"
                      className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}
              {loginError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="auth-submit">
                {isSubmitting ? "Processing..." : resetStep === "request" ? "Send Reset Code" : "Update Password"}
              </button>
              <div className="flex justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => {
                    setResetStep(resetStep === "request" ? "confirm" : "request");
                    setLoginError(null);
                  }}
                  className="underline hover:text-foreground"
                >
                  {resetStep === "request" ? "Already have a reset code?" : "Request a new code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    clearErrors();
                  }}
                  className="underline hover:text-foreground"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
          <>

          <div
            className="auth-mode-switch"
            role="group"
            aria-label="Account access"
          >
            <button
              type="button"
              aria-pressed={mode === "signin"}
              onClick={() => {
                setMode("signin");
                setFieldErrors({});
                clearErrors();
              }}
            >
              {t("cta.signIn")}
            </button>
            <button
              type="button"
              aria-pressed={mode === "register"}
              onClick={() => {
                setMode("register");
                setFieldErrors({});
                clearErrors();
              }}
            >
              {t("cta.register")}
            </button>
          </div>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="my-5">
              <GoogleSignInButton
                onSuccess={submitGoogle}
                onError={setGoogleError}
                disabled={isSubmitting}
              />
              {/* Google sign-in error — shown near the Google button */}
              {googleError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400 animate-in fade-in"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{googleError}</span>
                </div>
              )}
              <p className="mt-4 text-center text-xs text-muted-foreground">
                or continue with email or mobile
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === "register" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
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
              <label
                htmlFor="contact"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span>
                  {t("auth.mobile")} / {t("auth.email")}
                </span>
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
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
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
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
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
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-0 top-0 grid size-11 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm"
                  className="text-xs font-semibold text-foreground flex items-center justify-between"
                >
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

            {/* Email/Mobile login error — shown near the form fields, above Remember me */}
            {loginError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400 animate-in fade-in"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setResetStep("request");
                  setFieldErrors({});
                  clearErrors();
                }}
                className="text-teal-600 dark:text-teal-400 underline-offset-2 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === "signin" ? t("cta.signIn") : t("cta.register")}
                  </span>
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
                clearErrors();
              }}
            >
              {mode === "signin" ? t("cta.register") : t("cta.signIn")}
            </button>
          </p>
          </>
          )}

          <div className="mt-8 border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
            <p className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              {t("auth.subtitle")}
            </p>
            <div className="mt-2 flex justify-center gap-4 text-slate-400">
              <Link to="/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </section>
      <aside className="auth-ocean-panel">
        <img src="/hero-ocean-surface.webp" alt="" width={1920} height={1080} />
        <div className="auth-ocean-top">
          <OrcaLogo className="size-9" />
          <span>ORCA</span>
        </div>
        <div className="auth-ocean-copy">
          <span>OCEAN INTELLIGENCE, WITH CONTEXT</span>
          <h2>
            {lang === "gu"
              ? "દરિયો સમજો.\nવિચારીને આગળ વધો."
              : lang === "hi"
                ? "समुद्र को समझें।\nसोचकर आगे बढ़ें।"
                : "Know the sea.\nPlan with clarity."}
          </h2>
          <p>{t("land.f4d")}</p>
          <div className="auth-ocean-tags">
            <span>{t("nav.assistant")}</span>
            <span>{t("nav.map")}</span>
            <span>{t("land.languages")}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
