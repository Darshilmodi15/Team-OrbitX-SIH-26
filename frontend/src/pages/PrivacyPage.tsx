import { Link } from "react-router-dom";
import { useI18n } from "@/lib/orca/i18n";

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <article className="orca-container py-10">
      <h1 className="text-2xl font-semibold">{t("footer.privacy")}</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          ORCA Marine AI uses your location only to retrieve marine and weather conditions for the sea area
          around you, and to show relevant coastal advisories and emergency services.
        </p>
        <p>
          Your language preference, chosen location and account details are stored on your own device. They
          are not sold, shared with advertisers, or used for profiling.
        </p>
        <p>
          Marine and weather values are requested from public forecast services using your coordinates. No
          personal identity information is sent with those requests.
        </p>
        <p>
          You can clear your stored location and sign out at any time from Settings. Doing so removes the data
          held on this device.
        </p>
      </div>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-secondary hover:underline">
        {t("cta.back")}
      </Link>
    </article>
  );
}
