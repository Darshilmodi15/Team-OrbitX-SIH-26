import { guideCopy } from "@/lib/orca/guide-copy";
import { locationPickerCopy } from "@/lib/orca/location-picker-copy";
import { saveSelectedLocation } from "@/services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Crosshair, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { MapPanel } from "@/components/orca/MapPanel";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/orca/i18n";
import { useSession } from "@/lib/orca/session";
import {
  classifyLocation,
  formatCoords,
  reverseLabel,
  searchIndianPlaces,
  type Coords,
  type PlaceResult,
} from "@/lib/orca/geo";

// An India-wide viewport, never an inferred user location.
const DEFAULT_CENTER: Coords = { lat: 21, lon: 79 };

export default function LocationPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const route = useLocation();
  const { location, setLocation } = useSession();

  const [coords, setCoords] = useState<Coords>(location?.coords ?? DEFAULT_CENTER);
  const [label, setLabel] = useState<string | null>(location?.label ?? null);
  const [selected, setSelected] = useState(!!location);
  const [source, setSource] = useState<"gps" | "manual">("manual");
  const [accuracy, setAccuracy] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const abort = useRef<AbortController | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const copy = locationPickerCopy[lang];

  function closeSearch() {
    abort.current?.abort();
    setSearchOpen(false);
    setActiveResult(-1);
  }

  const check = classifyLocation(coords);
  function choose(next: Coords) {
    if (busy) return;
    closeSearch();
    setSelected(true); setSource("manual"); setAccuracy(undefined); setLabel(null); setCoords(next); setNotice(null);
  }
  function enterCoordinates(event: React.FormEvent) {
    event.preventDefault();
    const lat = Number(latitude), lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { setNotice(t("state.error")); return; }
    choose({lat, lon});
  }

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    reverseLabel({ lat: coords.lat, lon: coords.lon }).then((l) => {
      if (!cancelled && l) setLabel(l);
    });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lon, selected]);

  function useGps() {
    closeSearch();
    if (!("geolocation" in navigator)) return setNotice(t("loc.unavailable"));
    setBusy(true);
    setNotice(t("loc.searching"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setNotice(null);
        setSelected(true); setSource("gps"); setAccuracy(pos.coords.accuracy);
        setLabel(null); setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        setNotice(t("loc.denied"));
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  useEffect(() => {
    if (!searchOpen || query.trim().length < 3) return;
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchIndianPlaces(query.trim(), controller.signal);
        if (!controller.signal.aborted) {
          setResults(places);
          setSearchState("done");
        }
      } catch {
        if (!controller.signal.aborted) setSearchState("error");
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, searchOpen, searchAttempt]);

  function selectResult(result: PlaceResult) {
    choose(result.coords);
    const name = [result.name, result.admin].filter(Boolean).join(", ");
    setLabel(name);
    setQuery(name);
    setResults([]);
  }

  async function confirm() {
    if (!selected || busy) return;
    closeSearch();
    setBusy(true);
    try {
      const validated = await saveSelectedLocation(coords.lat, coords.lon, source === "gps" ? accuracy : undefined);
      if (!validated.is_coastal_supported) { setNotice(t("loc.inland")); return; }
    setLocation({
      coords,
      label: label ?? formatCoords(coords),
      distanceToCoastKm: validated.distance_to_coast_km,
      admin: validated.coastal_region,
      area: "coastal",
      source,
    });
    const from = route.state?.from;
    navigate((["/dashboard", "/map", "/assistant", "/alerts", "/services"].includes(from) || /^\/assistant\/c\/[0-9a-f-]{36}$/i.test(from)) ? from : "/dashboard", { replace: true });
    } catch { setNotice(t("state.error")); } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <SEO
        title="Select Coastal Harbour & Port Base | ORCA Marine AI"
        description="Choose your departure harbour, fishing radius, and coastal coordinates across India's exclusive economic zone."
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
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

        <section aria-label={t("loc.confirm")} className="sticky top-24 z-20 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            <p className="text-sm font-semibold">{selected ? label ?? formatCoords(coords) : copy.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selected ? formatCoords(coords) : t("loc.search")}</p>
          </div>
          <button className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 text-sm font-bold text-slate-950 shadow-sm hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !selected} onClick={confirm}>
            <MapPin className="size-4" aria-hidden />{busy ? t("state.loading") : t("loc.confirm")}
          </button>
        </section>
        {notice && <p className="rounded-md border border-caution/40 bg-caution-surface p-3 text-sm text-foreground" role="status">{notice}</p>}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <section className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <label htmlFor="place-search" className="block text-sm font-semibold">{t("loc.search")}</label>
        <div onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeSearch(); }}>
        <form onSubmit={(event) => { event.preventDefault(); if (query.trim().length >= 3) { abort.current?.abort(); setResults([]); setActiveResult(-1); setSearchState("loading"); setSearchOpen(true); setSearchAttempt(n => n + 1); } }} className="flex gap-2">
          <input
            id="place-search" value={query} disabled={busy} autoComplete="off"
            onChange={(event) => { abort.current?.abort(); setQuery(event.target.value); setResults([]); setActiveResult(-1); setSearchState(event.target.value.trim().length >= 3 ? "loading" : "idle"); setSearchOpen(true); }}
            onFocus={() => { if (query.trim().length >= 3) { setSearchOpen(true); setSearchState("loading"); } }}
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
              if (searchOpen && results.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                event.preventDefault();
                setActiveResult(index => event.key === "ArrowDown" ? (index + 1) % results.length : (index <= 0 ? results.length - 1 : index - 1));
              }
              if (event.key === "Enter" && searchOpen && activeResult >= 0 && results[activeResult]) { event.preventDefault(); selectResult(results[activeResult]); }
            }}
            placeholder={t("loc.search")} role="combobox" aria-autocomplete="list" aria-expanded={searchOpen && results.length > 0} aria-controls={searchOpen && results.length ? "place-results" : undefined} aria-activedescendant={searchOpen && activeResult >= 0 ? `place-result-${activeResult}` : undefined} aria-describedby="place-search-hint"
            className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <button type="submit" disabled={busy || query.trim().length < 3} className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground disabled:opacity-50" aria-label={t("loc.search")}><Search className="size-4" aria-hidden /></button>
        </form>
        {searchOpen && results.length > 0 && (
          <ul id="place-results" role="listbox" aria-label={t("loc.search")} className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {results.map((result, index) => <li key={`${result.name}-${result.coords.lat}-${result.coords.lon}`} id={`place-result-${index}`} role="option" aria-selected={activeResult === index}>
              <button type="button" disabled={busy} onClick={() => selectResult(result)} className={`flex min-h-12 w-full flex-col items-start px-4 py-2 text-left text-foreground hover:bg-muted ${activeResult === index ? "bg-muted" : ""}`}>
                <span className="text-sm font-semibold">{result.name}</span><span className="text-xs text-muted-foreground">{result.admin}</span>
              </button>
            </li>)}
          </ul>
        )}
        <p id="place-search-hint" role="status" className="mt-2 text-xs text-muted-foreground">
          {searchOpen && searchState === "loading" ? t("state.loading") : searchOpen && searchState === "error" ? t("state.error") : searchOpen && searchState === "done" && !results.length ? copy.none : copy.hint}
        </p>
        </div>
        <div className="border-t border-border pt-4">
          <button
            onClick={useGps}
            disabled={busy}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Crosshair className="size-4" aria-hidden />
            <span>{t("loc.allow")}</span>
          </button>
        </div>
        <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-semibold">{copy.coordinates}</summary>
        <form onSubmit={enterCoordinates} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Latitude (°)<input className="block min-h-11 w-36 rounded-md border p-2" aria-label="Latitude" inputMode="decimal" type="number" step="any" min={-90} max={90} required value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
          <label className="text-sm">Longitude (°)<input className="block min-h-11 w-36 rounded-md border p-2" aria-label="Longitude" inputMode="decimal" type="number" step="any" min={-180} max={180} required value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
          <button className="min-h-11 rounded-md border px-3" type="submit" disabled={busy}>{t("loc.manual")}</button>
        </form>
        </details>
        <p className="text-xs leading-relaxed text-muted-foreground">{guideCopy[lang].pin}</p>
        </section>

        {/* Interactive Map */}
        <section className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("loc.tapMap")}</p>
          <div className="overflow-hidden rounded-md border border-border shadow-xs">
            <MapPanel center={coords} hasSelection={selected} interactive={!busy} height={360} onSelect={choose} />
          </div>
        </section>
        </div>

        {/* Location Assessment & Confirmation Box */}
        {selected ? <div className="rounded-md border border-border bg-card p-4 shadow-sm text-card-foreground">
          <p className="text-sm text-foreground">
            {t("loc.coastDistance")} ({copy.approximate}): <strong>{check.distanceToCoastKm} km</strong>
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

            </div>
          )}

        </div> : null}
      </div>
    </AppShell>
  );
}
