import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/orca/session";
import { useI18n } from "@/lib/orca/i18n";

export function LocationGate({ children }: { children: ReactNode }) {
  const { location, locationReady } = useSession();
  const { pathname } = useLocation();
  const { t } = useI18n();
  if (locationReady === false) return <p role="status" className="p-6">{t("state.loading")}</p>;
  return location?.area === "coastal" ? children : <Navigate to="/location" state={{ from: pathname }} replace />;
}
