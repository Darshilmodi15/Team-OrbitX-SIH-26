import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <article className="orca-container py-10">
      <h1 className="text-2xl font-semibold">{t("footer.terms")}</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>{t("terms.body1")}</p>
        <p>{t("terms.body2")}</p>
        <p>{t("terms.body3")}</p>
        <p>{t("terms.body4")}</p>
      </div>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-secondary hover:underline">
        {t("cta.back")}
      </Link>
    </article>
  );
}
