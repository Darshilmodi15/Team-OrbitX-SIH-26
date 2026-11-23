import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/orca/session";
import { useI18n } from "@/lib/orca/i18n";
import { MatsyaLoader } from "./MatsyaLoader";

export function LocationGate({ children }: { children: ReactNode }) {
  const { location, locationReady } = useSession();
  const { pathname } = useLocation();
  const { t } = useI18n();
  if (locationReady === false) return <MatsyaLoader variant="fullscreen" message={t("state.loading")} />;
  return location?.area === "coastal" ? children : <Navigate to="/location" state={{ from: pathname }} replace />;
}
