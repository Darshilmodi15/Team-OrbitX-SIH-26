import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/orca/AppShell";
import { useSession } from "@/lib/orca/session";
import { fetchActiveSos, fetchAdminUsers, fetchSystemHealth } from "@/services/api";

export default function OperationsPage() {
  const { user } = useSession();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const request = user?.role === "admin"
      ? Promise.all([fetchSystemHealth(), fetchAdminUsers(), fetchActiveSos()]).then(([health, users, sos]) => ({ health, users, sos }))
      : fetchActiveSos().then((sos) => ({ sos }));
    request.then(setData).catch((e) => setError(e.message || "Operational data unavailable"));
  }, [user?.role]);
  const title = user?.role === "admin" ? "System Overview" : "Operational Overview";
  return <AppShell><section className="space-y-5">
    <div><p className="text-sm font-semibold text-teal-400">{user?.role === "admin" ? "Administration" : "Government officer"}</p><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-muted-foreground">Live, authorized operational information. Unavailable values are never replaced with invented statistics.</p></div>
    {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300"><AlertTriangle className="mr-2 inline size-4" />{error}</div>}
    {!data && !error && <div className="rounded-xl border border-border p-8 text-muted-foreground"><Activity className="mr-2 inline size-4 animate-pulse" />Loading authorized operational data…</div>}
    {data && <div className="grid gap-4 md:grid-cols-3">
      {user?.role === "admin" && <><Metric icon={Users} label="Registered users" value={data.health?.registered_users_count} /><Metric icon={ShieldCheck} label="Active SOS" value={data.health?.active_sos_count} /><Metric icon={Activity} label="System status" value={data.health?.overall_status} /></>}
      {user?.role === "government" && <Metric icon={ShieldCheck} label="Active SOS requests" value={data.sos?.length} />}
    </div>}
    {data?.sos && <div className="rounded-xl border border-border bg-card"><h2 className="border-b border-border p-4 text-lg font-semibold">SOS / emergency requests</h2>{data.sos.length === 0 ? <p className="p-6 text-muted-foreground">No active SOS requests.</p> : <div className="divide-y divide-border">{data.sos.map((s:any)=><article key={s.sos_id} className="p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{s.sos_id}</strong><span className="text-amber-400">{s.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{s.assigned_mrcc} · {new Date(s.broadcast_timestamp).toLocaleString()}</p></article>)}</div>}</div>}
    {user?.role === "admin" && data?.users && <div className="rounded-xl border border-border bg-card"><h2 className="border-b border-border p-4 text-lg font-semibold">User & officer management</h2>{data.users.length === 0 ? <p className="p-6 text-muted-foreground">No persisted accounts found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-4">Account</th><th className="p-4">Role</th><th className="p-4">Contact</th></tr></thead><tbody>{data.users.map((u:any)=><tr key={u.id} className="border-t border-border"><td className="p-4 font-medium">{u.name}</td><td className="p-4">{u.role}</td><td className="p-4 text-muted-foreground">{u.email || u.mobile_number || "Not provided"}</td></tr>)}</tbody></table></div>}</div>}
    {user?.role === "admin" && data?.health?.services && <div className="rounded-xl border border-border bg-card"><h2 className="border-b border-border p-4 text-lg font-semibold">API & data health</h2><div className="divide-y divide-border">{data.health.services.map((s:any)=><div key={s.service_name} className="grid gap-1 p-4 sm:grid-cols-3"><strong>{s.service_name}</strong><span>{s.status}{s.fallback_in_use ? " · fallback configured" : ""}</span><span className="text-muted-foreground">{s.last_error_summary || `Checked ${new Date(s.last_checked).toLocaleString()}`}</span></div>)}</div></div>}
    {user?.role === "government" && <div className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Communication & outreach</h2><p className="mt-2 text-sm text-muted-foreground">No verified outbound notification provider is configured. ORCA will not claim that messages were sent; this section is the integration boundary for an authorized provider.</p></div>}
  </section></AppShell>;
}

function Metric({ icon: Icon, label, value }: any) { return <div className="rounded-xl border border-border bg-card p-5"><Icon className="size-5 text-teal-400"/><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value ?? "Unavailable"}</p></div>; }
