import { useEffect, useRef, useState } from "react";
import { broadcastSOS, updateSOSDetails } from "../services/api";
import type { LocationCoords } from "../context/AppContext";
import { useI18n } from "@/lib/orca/i18n";
import { incidentCopy } from "@/lib/orca/incident-copy";
import { saveDetails } from "@/lib/orca/review-copy";
import { getStrings } from "../i18n";

interface Props {isOpen: boolean; onClose:()=>void; userLocation:LocationCoords; currentLang?:string; locationName?:string; locationSource?:"selected"|"gps"|"manual"|"unspecified";}
export default function EmergencySOSModal({isOpen,onClose,userLocation,locationName,locationSource="unspecified"}:Props) {
 const {t,lang}=useI18n(); const old=getStrings(lang); const copy=incidentCopy(lang);
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{if(!isOpen)return; const previous=document.activeElement as HTMLElement|null; panel.current?.focus();
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!pending.current)onClose(); if(e.key==="Tab"){const items=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea');if(!items?.length)return; const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);previous?.focus();};},[isOpen,onClose]);
 const pending=useRef(false); const [busy,setBusy]=useState(false); const [failed,setFailed]=useState(false);
 const [record,setRecord]=useState<{sos_id:string}|null>(null); const [notes,setNotes]=useState(""); const [saved,setSaved]=useState(false); const [error,setError]=useState("");
 async function send() {
  if(pending.current) return; pending.current=true; setBusy(true); setFailed(false);
  try { const result=await broadcastSOS({lat:userLocation.lat,lon:userLocation.lon,emergency_nature:"General Emergency",notes:notes.trim(),location_name:locationName,location_source:locationSource});
   if(!result?.sos_id || result.status!=="RECEIVED") throw new Error("SOS_NOT_CONFIRMED"); setRecord(result);
  } catch (err) {setError(err instanceof Error && err.message === "SOS_SELECTED_LOCATION_CHANGED" ? copy.locationChanged : copy.failed);setFailed(true);} finally {pending.current=false;setBusy(false);}
 }
 async function update() {if(pending.current || !record || !notes.trim())return;pending.current=true;setBusy(true);setFailed(false);setSaved(false);
  try {await updateSOSDetails(record.sos_id,notes.trim());setSaved(true);}catch{setFailed(true);}finally{pending.current=false;setBusy(false);}
 }
 if(!isOpen)return null;
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sos-title" className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-lg border border-border bg-card p-5 text-card-foreground">
  <div className="flex items-center justify-between gap-3"><h2 id="sos-title" className="text-xl font-semibold">SOS</h2><button className="min-h-11 px-3" onClick={onClose} disabled={busy} aria-label={old.sosCancel}>×</button></div>
  <p className="my-3 text-sm">{t("sos.confirmDesc")}</p><div className="mb-4 flex gap-4"><a className="underline" href="tel:112">{t("svc.call")} 112</a><a className="underline" href="tel:1554">1554</a></div>
  <p className="mb-4 text-sm">{copy.incident}: {locationName ? `${locationName} · ` : ""}{userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)} · {copy[locationSource]}</p>
  {failed && <p role="alert" className="my-3 text-destructive">{error || copy.failed}</p>}
  <label className="my-4 block">{copy.description}<textarea className="mt-2 min-h-24 w-full rounded-md border border-border bg-background p-3" value={notes} maxLength={2000} disabled={busy} onChange={e=>{setNotes(e.target.value);setSaved(false);}} /></label>
  {!record ? <button className="min-h-12 w-full rounded-md bg-destructive px-4 text-white disabled:opacity-50" onClick={send} disabled={busy}>{busy?t("state.loading"):t("sos.submit")}</button> : <>
   <p role="status" className="font-semibold">{t("sos.received")} · {record.sos_id}</p>
   <button className="mt-3 min-h-11 rounded-md border border-border px-4" onClick={update} disabled={busy || !notes.trim()}>{busy?t("state.loading"):saveDetails[lang]}</button>
   {saved && <p role="status">{t("sos.received")}</p>}
  </>}
 </section></div>;
}
