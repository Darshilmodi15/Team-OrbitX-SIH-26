import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { OrcaLogo } from "@/components/orca/Logo";
import { MapPanel } from "@/components/orca/MapPanel";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import {
  classifyLocation,
  formatCoords,
  nearestCoastPoint,
  reverseLabel,
  searchIndianPlaces,
  type Coords,
  type PlaceResult,
} from "@/lib/orca/geo";

const DEFAULT_CENTER: Coords = { lat: 19.076, lon: 72.877 };

export default function LocationPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { location, setLocation } = useSession();

  const [coords, setCoords] = useState<Coords>(location?.coords ?? DEFAULT_CENTER);
  const [label, setLabel] = useState<string | null>(location?.label ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const abort = useRef<AbortController | null>(null);

  const check = classifyLocation(coords);

  useEffect(() => {
    let cancelled = false;
    reverseLabel(coords).then((l) => {
      if (!cancelled && l) setLabel(l);
    });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lon]);

  function useGps() {
    if (!("geolocation" in navigator)) return setNotice(t("loc.unavailable"));
    setBusy(true);
    setNotice(t("loc.searching"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setNotice(null);
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        setNotice(t("loc.denied"));
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    abort.current?.abort();
    abort.current = new AbortController();
    try {
      setResults(await searchIndianPlaces(query, abort.current.signal));
      setNotice(null);
    } catch {
      setNotice(t("state.error"));
    }
  }

  function confirm() {
    setLocation({
      coords,
      label: label ?? formatCoords(coords),
      distanceToCoastKm: check.distanceToCoastKm,
      area: check.area,
      source: "manual",
    });
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8">
      <OrcaLogo className="size-9" />
      <h1 className="mt-5 text-2xl font-semibold">{t("loc.title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("loc.why")}</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={useGps} disabled={busy}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-110 disabled:opacity-50"
        >
          <Crosshair className="size-4" aria-hidden />
          <span>{t("loc.allow")}</span>
        </button>
        <button
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-semibold transition hover:bg-muted"
          onClick={() => document.getElementById("place-search")?.focus()}
        >
          <MapPin className="size-4" aria-hidden />
          <span>{t("loc.manual")}</span>
        </button>
      </div>

      <form onSubmit={runSearch} className="mt-4 flex gap-2">
        <input
          id="place-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("loc.search")}
          className="flex h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
          aria-label={t("loc.search")}
        />
        <button type="submit" className="flex h-11 items-center justify-center rounded-md border border-border bg-card px-4 transition hover:bg-muted" aria-label={t("loc.search")}>
          <Search className="size-4" aria-hidden />
        </button>
      </form>

      {results.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
          {results.map((r) => (
            <li key={`${r.name}-${r.coords.lat}-${r.coords.lon}`}>
              <button
                type="button"
                className="flex min-h-12 w-full flex-col items-start justify-center px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  setCoords(r.coords);
                  setLabel([r.name, r.admin].filter(Boolean).join(", "));
                  setResults([]);
                }}
              >
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.admin}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <p className="mt-4 rounded-md border border-caution/40 bg-caution-surface p-3 text-sm" role="status">
          {notice}
        </p>
      )}

      <p className="mt-5 text-xs text-muted-foreground">{t("loc.tapMap")}</p>
      <div className="mt-2">
        <MapPanel center={coords} interactive height={280} onSelect={setCoords} />
      </div>

      <div className="mt-4 rounded-md border border-border bg-card p-4">
        <p className="text-sm font-semibold">{label ?? formatCoords(coords)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatCoords(coords)}</p>
        <p className="mt-2 text-sm">
          {t("loc.coastDistance")}: <strong>{check.distanceToCoastKm} km</strong>
        </p>

        {check.area === "outside-india" && (
          <p className="mt-3 rounded-md border border-danger/40 bg-danger-surface p-3 text-sm text-danger" role="alert">
            {t("loc.outsideIndia")}
          </p>
        )}
        {check.area === "inland" && (
          <div className="mt-3 space-y-2 rounded-md border border-caution/40 bg-caution-surface p-3">
            <p className="text-sm" role="alert">
              {t("loc.inland")}
            </p>
            <button
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setCoords(nearestCoastPoint(coords))}
            >
              {t("loc.chooseCoastal")}
            </button>
          </div>
        )}

        <button
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-110 disabled:opacity-50"
          disabled={check.area !== "coastal"}
          onClick={confirm}
        >
          {t("loc.confirm")}
        </button>
      </div>
    </div>
  );
}
