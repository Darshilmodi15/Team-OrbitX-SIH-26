import { lazy, Suspense, useEffect, useState } from "react";
import { useI18n } from "@/lib/orca/i18n";
import type { Coords } from "@/lib/orca/geo";
import { mapCopy } from "@/lib/orca/map-copy";
import { snapshotBundle, snapshotPFZ, useMarineSnapshot, type MarineSnapshot } from "@/lib/orca/snapshot";
import { MarineConditions } from "./Conditions";
import { SnapshotDetails } from "./SnapshotDetails";
const CoastMap=lazy(()=>import("./CoastMap"));
export function MapPanel({center,interactive=false,height=240,onSelect,snapshot:provided,compact=false}:{center:Coords;interactive?:boolean;height?:number;onSelect?:(c:Coords)=>void;snapshot?:MarineSnapshot;compact?:boolean}){
  const {t,lang}=useI18n();const state=useMarineSnapshot();
  useEffect(()=>{if(!onSelect && !provided)state.activate();},[onSelect,provided,state.activate]);
  const s=provided ?? (onSelect ? undefined : state.snapshot);
  const [mode,setMode]=useState<"text"|"map"|"satellite">(()=>{try{return !onSelect && localStorage.getItem("orca.map.mode")==="text" ? "text":"map";}catch{return "map";}});const [pfz,setPFZ]=useState(true),[eez,setEEZ]=useState(true),[conditions,setConditions]=useState(true);
  const advisory=snapshotPFZ(s);
  return <div className="space-y-3" data-snapshot-id={s?.snapshot_id}>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("map.layers")}>{(["text","map","satellite"] as const).filter(x=>!onSelect || x!=="text").map(x=><button key={x} type="button" onClick={()=>{setMode(x);try{localStorage.setItem("orca.map.mode",x);}catch{/* Optional preference. */}}} aria-pressed={mode===x} className="min-h-11 rounded border px-3 text-sm">{mapCopy[lang][x]}</button>)}</div>
    {!onSelect && <>
      <p role="status" className="text-sm">{advisory.status === "current" ? `${t("glossary.pfz.full")}: ${advisory.points.length}` : lang === "en" ? "Current verified PFZ advisory unavailable" : mapCopy[lang][advisory.status]}</p>
      {s?.boundary.availability !== "available" && <p className="text-sm">EEZ: {t("chat.unavailable")}</p>}
      <div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={pfz} onChange={e=>setPFZ(e.target.checked)} /> PFZ</label><label><input type="checkbox" checked={eez} onChange={e=>setEEZ(e.target.checked)} /> EEZ · VLIZ</label><label><input type="checkbox" checked={conditions} onChange={e=>setConditions(e.target.checked)} /> {t("marine.title")}</label></div>
    </>}
    {mode !== "text" && <Suspense fallback={<div style={{height}}>{t("state.loading")}</div>}><CoastMap center={center} interactive={interactive} height={height} onSelect={onSelect} satellite={mode==="satellite"} snapshot={s} showPFZ={pfz} showEEZ={eez} showConditions={conditions}/></Suspense>}
    {mode === "text" && advisory.points.length > 0 && <ul>{advisory.points.map(p=><li key={p.id}>{p.name}: {p.lat}, {p.lon} · {p.distanceKm} km</li>)}</ul>}
    {s && !compact && <><SnapshotDetails snapshot={s} offline={state.offline}/>{(interactive || mode==="text") && <MarineConditions data={snapshotBundle(s,state.offline).current}/>}</>}
  </div>;
}
