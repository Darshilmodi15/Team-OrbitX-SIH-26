import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { AppShell } from "@/components/orca/AppShell";
import { useSession } from "@/lib/orca/session";
import { useI18n, type TKey } from "@/lib/orca/i18n";
import { fetchActiveSos, fetchAdminUsers, fetchSystemHealth } from "@/services/api";

type Service = { service_name: string; service_id?: string; real_data_arriving?: boolean; status: string; provider?: string; last_checked?: string; last_successful_response?: string; last_failure?: string; last_error_summary?: string; last_failure_reason?: string; http_status?: number; data_mode?: string; data_timestamp?: string };
export default function OperationsPage() {
  const { user, location } = useSession();
  const { t, lang } = useI18n();
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<any[] | null>(null);
  const [sos, setSos] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const admin = user?.role === "admin";
  useEffect(() => {
    let cancelled = false;
    setErrors([]); setHealth(null); setUsers(null); setSos(null);
    const run = (key: string, request: Promise<any>, receive: (value: any) => void) => request.then(value => { if (!cancelled) receive(value); }).catch(() => { if (!cancelled) setErrors(previous => [...previous, key]); });
    void run("ops.sos", fetchActiveSos(), setSos);
    if (admin) { void run("ops.health", fetchSystemHealth(), setHealth); void run("ops.accounts", fetchAdminUsers(), setUsers); }
    return () => { cancelled = true; };
  }, [admin, user?.id, revision]);
  useEffect(() => {
    const refreshSos = () => {
      fetchActiveSos().then(records => { if (records) setSos(records); }).catch(() => {});
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", refreshSos);
      window.addEventListener("orca:sos_broadcasted", refreshSos);
      const interval = setInterval(refreshSos, 10000);
      return () => {
        window.removeEventListener("storage", refreshSos);
        window.removeEventListener("orca:sos_broadcasted", refreshSos);
        clearInterval(interval);
      };
    }
  }, []);
  const state = (value: string): string => t(({ HEALTHY: "health.healthy", DEGRADED: "health.degraded", DOWN: "health.down", UNKNOWN: "health.unknown" } as Record<string, TKey>)[value] || "chat.unavailable");
  const date = (value?: string) => value ? new Date(value).toLocaleString(lang) : t("chat.unavailable");
  const metric = (label: TKey, value: React.ReactNode) => <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{t(label)}</p><p className="mt-2 text-2xl font-bold">{value ?? t("chat.unavailable")}</p></div>;
  return <AppShell><SEO title={`${t(admin ? "ops.system" : "ops.overview")} | ORCA Marine AI`} description={t(admin ? "ops.health" : "ops.region")} /><section className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-teal-400">{t(admin ? "ops.admin" : "ops.officer")}</p><h1 className="text-3xl font-bold">{t(admin ? "ops.system" : "ops.overview")}</h1></div><button className="rounded-md border border-border px-4 py-2" onClick={() => setRevision(value => value + 1)}>{t("cta.retry")}</button></div>
    {!admin && <div className="rounded-xl border border-border p-4"><h2 className="font-semibold">{t("ops.region")}</h2><p>{user?.operationalRegion || location?.label || t("chat.unavailable")}</p><Link className="text-teal-400 underline" to="/location">{t("loc.manual")}</Link></div>}
    {errors.map(key => <p role="alert" key={key} className="rounded-xl border border-red-500/40 p-4 text-red-400">{t(key as TKey)}: {t("state.liveUnavailable")}</p>)}
    <div className={admin ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-4"}>{metric("ops.sos", sos?.length)}{admin && <>{metric("ops.users", health?.registered_users_count)}{metric("ops.system", health ? state(health.overall_status) : undefined)}</>}</div>
    <section className="rounded-xl border border-border bg-card"><h2 className="border-b border-border p-4 text-lg font-semibold">{t("ops.sos")}</h2>{sos === null ? <p className="p-4">{t(errors.includes("ops.sos") ? "chat.unavailable" : "state.loading")}</p> : sos.length === 0 ? <p className="p-6 text-muted-foreground">{t("ops.noSos")}</p> : <div className="divide-y divide-border">{sos.map(s => <article key={s.sos_id} className="space-y-2 p-4"><strong>{s.sos_id}</strong><p>{s.assigned_mrcc || "MRCC Indian Coast Guard"} · {date(s.broadcast_timestamp || s.created_at)}</p><p>{t(s.status === "RECEIVED" ? "sos.status.RECEIVED" : s.status === "RESOLVED" ? "sos.status.RESOLVED" : s.status === "RESPONDING" ? "sos.status.IN_PROGRESS" : "chat.unavailable")}</p>{(s.recorded_telemetry || s.lat != null) && <p className="font-mono text-sm">{s.recorded_telemetry?.lat ?? s.recorded_telemetry?.latitude ?? s.lat} · {s.recorded_telemetry?.lon ?? s.recorded_telemetry?.longitude ?? s.lon}{s.recorded_telemetry?.vessel_name || s.vessel_name ? ` · ${s.recorded_telemetry?.vessel_name || s.vessel_name}` : ""}</p>}</article>)}</div>}</section>
    {admin && users && <section className="rounded-xl border border-border bg-card"><h2 className="p-4 text-lg font-semibold">{t("ops.accounts")}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["auth.name", "ops.role", "ops.contact"].map(key => <th className="p-4" key={key}>{t(key as TKey)}</th>)}</tr></thead><tbody>{users.map(u => <tr className="border-t border-border" key={u.id}><td className="p-4">{u.name}</td><td className="p-4">{t(u.role === "SUPER_ADMIN" ? "ops.admin" : u.role === "GOVERNMENT" ? "ops.officer" : "ops.users")}</td><td className="p-4">{u.email || u.mobile_number || t("chat.unavailable")}</td></tr>)}</tbody></table></div></section>}
    {admin && health?.services && <section className="rounded-xl border border-border bg-card"><h2 className="p-4 text-lg font-semibold">{t("ops.health")}</h2><div className="divide-y divide-border">{health.services.map((s: Service) => <article key={s.service_name} className="space-y-3 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{s.provider} · {t((`health.service.${s.service_id}`) as TKey)}</strong><span>{state(s.status)}</span></div><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{([["health.receiving", t(s.real_data_arriving ? "health.receivingYes" : "health.receivingNo")], ["health.checked", date(s.last_checked)], ["health.success", date(s.last_successful_response)], ["health.failure", date(s.last_failure)], ["health.mode", t(s.data_mode === "live" ? "state.live" : s.data_mode === "fallback" ? "health.fallback" : s.data_mode === "stale" ? "health.stale" : "chat.unavailable")], ["state.updated", date(s.data_timestamp)]] as Array<[TKey, string]>).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{t(label)}</dt><dd>{value}</dd></div>)}</dl>{(s.last_error_summary || s.last_failure_reason || s.http_status) && <p className="break-words font-mono text-xs text-muted-foreground">{s.last_error_summary === "NOT_YET_VERIFIED" ? t("health.unknown") : [s.last_error_summary, s.last_failure_reason].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ")}{s.http_status ? ` · HTTP ${s.http_status}` : ""}</p>}</article>)}</div></section>}
    {!admin && <section className="rounded-xl border border-border p-5"><h2 className="font-semibold">{t("ops.communication")}</h2><p className="mt-2 text-muted-foreground">{t("ops.communicationUnavailable")}</p></section>}
  </section></AppShell>;
}
