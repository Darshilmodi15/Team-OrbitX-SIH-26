import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/orca/session";

export default function LanguagePage() {
  const { location } = useSession();
  // Safely redirect to dashboard if location is already set, otherwise redirect to homepage
  return <Navigate to={location ? "/dashboard" : "/"} replace />;
}

