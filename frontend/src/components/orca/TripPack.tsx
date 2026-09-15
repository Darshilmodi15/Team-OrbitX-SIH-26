import { useEffect, useRef, useState } from "react";
import type { LocationInfo, MarineBundle } from "@/lib/orca/types";
import { usePFZ } from "@/lib/orca/use-pfz";
import { useI18n } from "@/lib/orca/i18n";

export function TripPack({ location, bundle }: { location: LocationInfo; bundle: MarineBundle }) {
  const { lang } = useI18n();
  const pfz = usePFZ(undefined, location.coords, lang);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function download(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setStatus("");
    try {
      const { prepareTripPack, encryptTripPack } = await import("@/lib/orca/offline/trip-pack");
      const pack = prepareTripPack(location, bundle, pfz.advisory);
      const html = await encryptTripPack(pack, password);
      if (!mounted.current) return;
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = `orca-trip-${new Date(pack.savedAt).toISOString().slice(0, 10)}.html`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setPassword("");
      setStatus(`Download requested: ${pack.readings.length} readings, ${pack.forecast.length} forecast times; PFZ ${pack.pfz.status}. Open the file from Downloads, unlock it and check it without internet before departure. A download request does not confirm the file was saved.`);
    } catch {
      if (mounted.current) setStatus("Could not prepare the file. Use a current browser on HTTPS or localhost and a password of at least 12 characters. No pack was confirmed saved.");
    } finally { if (mounted.current) setBusy(false); }
  }
  return <section className="space-y-3 rounded-md border p-4" lang="en" aria-labelledby="trip-heading">
    <h2 id="trip-heading" className="font-semibold">Before departure: offline trip pack</h2>
    <p className="text-sm">Download a password-protected file for {location.label || "your selected location"} ({location.coords.lat.toFixed(4)}, {location.coords.lon.toFixed(4)}). Open it in a browser without internet, including after a restart.</p>
    <p className="text-sm">Includes available marine readings, forecast times and the advisory for this location. PFZ: {pfz.isPending ? "checking" : pfz.advisory.status}. Maximum pack age: 48 hours; readings expire after 3 hours and PFZ follows its own expiry. Missing data stays unavailable.</p>
    <p className="text-sm">No maps, live updates or SOS delivery. The file contains your selected coordinates. Anyone with the file and password can read it. Keep the password separately; it cannot be recovered. Delete downloaded copies from Files / Downloads after your trip.</p>
    <p className="text-sm"><a className="underline" href="/offline-trip-reader.html">Open trip file reader</a> · Downloaded files also open independently of ORCA.</p>
    <form onSubmit={download} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Trip password (12+ characters)<input className="mt-1 block rounded-md border p-3" type="password" minLength={12} maxLength={256} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
      <button className="min-h-12 rounded-md bg-secondary px-4 text-secondary-foreground disabled:opacity-50" disabled={busy || pfz.isPending} type="submit">{busy ? "Preparing…" : "Download trip pack"}</button>
    </form>
    <p role="status" className="text-sm">{status}</p>
  </section>;
}
