import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <article className="orca-container py-10">
      <h1 className="text-2xl font-semibold">{t("footer.terms")}</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          ORCA Marine AI provides decision support. It does not replace official warnings issued by the India
          Meteorological Department, the Indian Coast Guard, INCOIS or your state fisheries department.
        </p>
        <p>
          Forecast values can change quickly at sea. Always confirm conditions locally before going out, carry
          required safety equipment, and follow instructions from authorities.
        </p>
        <p>
          Emergency numbers listed in the app are nationally published contacts. In a life-threatening
          situation call 112 or the Indian Coast Guard on 1554 immediately.
        </p>
        <p>
          By using the platform you accept that ORCA Marine AI and its operators are not liable for decisions
          taken at sea based on the information shown.
        </p>
      </div>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-secondary hover:underline">
        {t("cta.back")}
      </Link>
    </article>
  );
}
