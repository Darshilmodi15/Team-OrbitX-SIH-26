import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, updateUserLocation } from "@/services/api";
import { useMarineSnapshot } from "@/lib/orca/snapshot";
import { useSession } from "@/lib/orca/session";

export function DemoControls() {
  const {setLocation,token} = useSession();
  const {demoScenario,setDemoScenario} = useMarineSnapshot();
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const {data} = useQuery({
    queryKey:["demo-scenarios"],
    queryFn: async () => {
      const response=await apiFetch("/api/marine/demo-scenarios");
      if (!response.ok) throw new Error("Demo configuration unavailable");
      return response.json() as Promise<Record<string,{name:string;lat:number;lon:number}>>;
    },
    staleTime:Infinity, retry:false,
  });
  if (!data || !Object.keys(data).length) return null;
  async function select(id:string) {
    if (!id) {setDemoScenario(""); return;}
    const scenario=data![id];
    if (!scenario) return;
    setBusy(true);setError("");
    try {
      const saved = await updateUserLocation(scenario.lat,scenario.lon,undefined,token ?? undefined);
      setLocation({coords:{lat:scenario.lat,lon:scenario.lon},label:scenario.name,area:"coastal",source:"manual",distanceToCoastKm:saved.distance_to_coast_km});
      setDemoScenario(id);
    } catch {setError("Could not select the demonstration location. Please retry.");}
    finally {setBusy(false);}
  }
  return <section className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm">
    <label className="flex flex-wrap items-center gap-3">Demonstration controls
      <select className="rounded border bg-background p-2" value={demoScenario} disabled={busy} onChange={e=>void select(e.target.value)}>
        <option value="">Real provider data only</option>
        {Object.entries(data).map(([id,scenario])=><option key={id} value={id}>{scenario.name} · allow illustrative fallback</option>)}
      </select>
    </label>
    <p className="mt-2 text-xs text-muted-foreground">Real data is preferred. Selecting a scenario allows a labelled illustrative dataset when the live snapshot is incomplete.</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
