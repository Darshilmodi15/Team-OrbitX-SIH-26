import { useState } from "react";
import { useI18n } from "@/lib/orca/i18n";
import type { MarineSnapshot } from "@/lib/orca/snapshot";
import { SnapshotDetails } from "./SnapshotDetails";
import { MapPanel } from "./MapPanel";

export function ChatSnapshot({snapshot}:{snapshot:MarineSnapshot}) {
  const {t}=useI18n();const [open,setOpen]=useState(false);
  return <div className="mt-3 space-y-2">
    <SnapshotDetails snapshot={snapshot}/>
    <button type="button" className="min-h-11 rounded-full border px-4 text-sm" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t("map.open")}</button>
    {open&&<MapPanel center={snapshot.location} snapshot={snapshot} height={280} interactive compact/>}
  </div>;
}
