import { saveSelectedLocation } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Crosshair, MapPin, Search, CheckCircle2, Anchor } from "lucide-react";
import { INDIAN_PORTS } from "@/data/maritimeData";
import { AppShell } from "@/components/orca/AppShell";
import { MapPanel } from "@/components/orca/MapPanel";
import { SEO } from "@/components/SEO";
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
  const [selected, setSelected] = useState(!!location);
  const [source, setSource] = useState<"gps" | "manual">("manual");
  const [accuracy, setAccuracy] = useState<number | undefined>();
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
        setSelected(true); setSource("gps"); setAccuracy(pos.coords.accuracy);
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

  async function confirm() {
    setBusy(true);
    try {
      const validated = await saveSelectedLocation(coords.lat, coords.lon, source === "gps" ? accuracy : undefined);
      if (!validated.is_coastal_supported) { setNotice(t("loc.inland")); return; }
    setLocation({
      coords,
      label: label ?? formatCoords(coords),
      distanceToCoastKm: check.distanceToCoastKm,
      area: check.area,
      source,
    });
    navigate("/dashboard");
    } catch { setNotice(t("state.error")); } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <SEO
        title="Select Coastal Harbour & Port Base | ORCA Marine AI"
        description="Choose your departure harbour, fishing radius, and coastal coordinates across India's exclusive economic zone."
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("loc.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("loc.why")}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted cursor-pointer shadow-xs"
          >
            <ArrowLeft className="size-3.5" />
            <span>{t("cta.back")}</span>
          </button>
        </div>

        {/* GPS vs Manual Options */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={useGps}
            disabled={busy}
            className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-teal-500 hover:bg-teal-400 px-4 text-sm font-bold text-slate-950 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Crosshair className="size-4" aria-hidden />
            <span>{busy ? t("loc.searching") : t("loc.allow")}</span>
          </button>
          <button
            className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted shadow-xs"
            onClick={() => document.getElementById("place-search")?.focus()}
          >
            <MapPin className="size-4 text-teal-400" aria-hidden />
            <span>{t("loc.manual")}</span>
          </button>
        </div>

        {/* Search Indian Coastal Places */}
        <form onSubmit={runSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="place-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("loc.search")}
              className="flex h-11 w-full rounded-md border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-xs"
              aria-label={t("loc.search")}
            />
          </div>
          <button
            type="submit"
            className="flex h-11 cursor-pointer items-center justify-center rounded-md bg-secondary px-5 text-secondary-foreground transition hover:brightness-110 shadow-xs"
            aria-label={t("loc.search")}
          >
            <Search className="size-4" aria-hidden />
          </button>
        </form>

        {/* Search Results Dropdown */}
        {results.length > 0 && (
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            {results.map((r) => (
              <li key={`${r.name}-${r.coords.lat}-${r.coords.lon}`}>
                <button
                  type="button"
                  className="flex min-h-12 w-full cursor-pointer flex-col items-start justify-center px-4 py-2.5 text-left text-foreground transition hover:bg-muted"
                  onClick={() => {
                    setSelected(true); setSource("manual");
                    setCoords(r.coords);
                    setLabel([r.name, r.admin].filter(Boolean).join(", "));
                    setResults([]);
                  }}
                >
                  <span className="text-sm font-semibold text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.admin}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Major Coastal Ports Quick Pick (Jury Showcase) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Anchor className="size-3.5 text-teal-500" />
              Major Indian Coastal Ports & Harbors ({INDIAN_PORTS.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {INDIAN_PORTS.map((port) => {
              const isCurrent = coords.lat === port.lat && coords.lon === port.lon;
              return (
                <button
                  key={port.id}
                  type="button"
                  onClick={() => {
                    setSelected(true);
                    setSource("manual");
                    setCoords({ lat: port.lat, lon: port.lon });
                    setLabel(`${port.name}, ${port.state}`);
                    setNotice(null);
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition cursor-pointer shadow-xs ${
                    isCurrent
                      ? "border-teal-500 bg-teal-500/10 text-teal-300 font-semibold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-xs font-bold truncate w-full">{port.name}</span>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-[10px] text-muted-foreground">{port.state}</span>
                    <span className="text-[10px] font-mono text-teal-400 font-semibold">
                      ~{port.defaultWeather?.wave_height_m}m · {port.defaultWeather?.wind_speed_kmh}km/h
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {notice && (
          <p className="rounded-md border border-caution/40 bg-caution-surface p-3 text-sm font-medium text-foreground" role="status">
            {notice}
          </p>
        )}

        {/* Interactive Map */}
        <section className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("loc.tapMap")}</p>
          <div className="overflow-hidden rounded-md border border-border shadow-xs">
            <MapPanel center={coords} interactive height={300} onSelect={(next) => { setSelected(true); setSource("manual"); setCoords(next); }} />
          </div>
        </section>

        {/* Location Assessment & Confirmation Box */}
        {selected ? <div className="rounded-md border border-border bg-card p-4 shadow-sm text-card-foreground">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-bold text-foreground">{label ?? formatCoords(coords)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground font-mono">{formatCoords(coords)}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-xs font-semibold text-teal-400">
              <CheckCircle2 className="size-3" />
              {t(check.area === "coastal" ? "loc.confirm" : "loc.inland")}
            </span>
          </div>

          <p className="mt-3 text-sm text-foreground">
            {t("loc.coastDistance")}: <strong className="text-teal-400">{check.distanceToCoastKm} km</strong>
          </p>

          {check.area === "outside-india" && (
            <p className="mt-3 rounded-md border border-danger/40 bg-danger-surface p-3 text-sm font-medium text-danger" role="alert">
              {t("loc.outsideIndia")}
            </p>
          )}

          {check.area === "inland" && (
            <div className="mt-3 space-y-2 rounded-md border border-caution/40 bg-caution-surface p-3 text-foreground">
              <p className="text-sm font-medium" role="alert">
                {t("loc.inland")}
              </p>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
                onClick={() => { setSelected(true); setSource("manual"); setCoords(nearestCoastPoint(coords)); }}
              >
                {t("loc.chooseCoastal")}
              </button>
            </div>
          )}

          <button
            className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-md bg-teal-500 hover:bg-teal-400 px-4 text-sm font-bold text-slate-950 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            disabled={busy || !selected || check.area !== "coastal"}
            onClick={confirm}
          >
            {t("loc.confirm")}
          </button>
        </div> : <p role="status" className="text-sm text-muted-foreground">{t("loc.title")}</p>}
      </div>
    </AppShell>
  );
}
