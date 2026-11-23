import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { IncidentCard } from "@/components/orca/IncidentCard";
import { SEO } from "@/components/SEO";
import { AppShell } from "@/components/orca/AppShell";
import { useSession } from "@/lib/orca/session";
import { useI18n, type TKey } from "@/lib/orca/i18n";
import {
  fetchActiveSos,
  fetchAdminUsers,
  fetchSystemHealth,
  updateSOSStatus,
} from "@/services/api";

type Service = {
  service_name: string;
  service_id?: string;
  real_data_arriving?: boolean;
  status: string;
  provider?: string;
  last_checked?: string;
  last_successful_response?: string;
  last_failure?: string;
  last_error_summary?: string;
  last_failure_reason?: string;
  http_status?: number;
  data_mode?: string;
  data_timestamp?: string;
};

type SosIncident = {
  sos_id: string;
  status: string;
  broadcast_timestamp?: string;
  assigned_mrcc?: string;
  mayday_message?: string;
  recorded_telemetry?: Record<string, any>;
};

export default function OperationsPage() {
  const { user, location } = useSession();
  const { t, lang } = useI18n();
  const [health, setHealth] = useState<any>(null);
  const [users, setUsers] = useState<any[] | null>(null);
  const [sos, setSos] = useState<SosIncident[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RECEIVED" | "RESPONDING">("ALL");
  const [updatingSosId, setUpdatingSosId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const admin = user?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    const run = (key: string, request: Promise<any>, receive: (value: any) => void) =>
      request
        .then((value) => {
          if (!cancelled) {
            setErrors((previous) => previous.filter((item) => item !== key));
            receive(value);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setErrors((previous) => (previous.includes(key) ? previous : [...previous, key]));
          }
        });
    void run("ops.sos", fetchActiveSos(), setSos);
    if (admin) {
      void run("ops.health", fetchSystemHealth(), setHealth);
      void run("ops.accounts", fetchAdminUsers(), setUsers);
    }
    return () => {
      cancelled = true;
    };
  }, [admin, user?.id, revision]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const refreshSos = () => {
      fetchActiveSos()
        .then((records) => {
          if (!cancelled && records) setSos(records);
        })
        .catch(() => {});
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", refreshSos);
      window.addEventListener("orca:sos_broadcasted", refreshSos);
      const interval = setInterval(refreshSos, 10000);
      return () => {
        cancelled = true;
        window.removeEventListener("storage", refreshSos);
        window.removeEventListener("orca:sos_broadcasted", refreshSos);
        clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function handleStatusChange(sosId: string, nextStatus: "RESPONDING" | "RESOLVED") {
    setUpdatingSosId(sosId);
    setActionError(null);
    try {
      const updated = await updateSOSStatus(sosId, nextStatus);
      setSos((prev) => {
        if (!prev) return prev;
        if (nextStatus === "RESOLVED") {
          return prev.filter((item) => item.sos_id !== sosId);
        }
        return prev.map((item) =>
          item.sos_id === sosId ? { ...item, ...(updated || {}), status: nextStatus } : item,
        );
      });
    } catch {
      setActionError("Failed to update SOS status. Please retry.");
    } finally {
      setUpdatingSosId(null);
    }
  }

  const state = (value: string): string =>
    t(
      (
        {
          HEALTHY: "health.healthy",
          DEGRADED: "health.degraded",
          DOWN: "health.down",
          UNKNOWN: "health.unknown",
        } as Record<string, TKey>
      )[value] || "chat.unavailable",
    );

  const date = (value?: string) => {
    if (!value) return t("chat.unavailable");
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts).toLocaleString(lang) : t("chat.unavailable");
  };

  const metric = (label: TKey, value: ReactNode) => (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{t(label)}</p>
      <p className="mt-2 text-2xl font-bold">{value ?? t("chat.unavailable")}</p>
    </div>
  );

  const userRoleKey = (role?: string): TKey => {
    const r = String(role || "").toLowerCase();
    return r === "super_admin" || r === "admin"
      ? "ops.admin"
      : r === "government"
        ? "ops.officer"
        : "ops.users";
  };

  const visibleSos =
    sos?.filter((item) => statusFilter === "ALL" || item.status === statusFilter) ?? null;

  return (
    <AppShell>
      <SEO
        title={`${t(admin ? "ops.system" : "ops.overview")} | Matsya`}
        description={t(admin ? "ops.health" : "ops.region")}
      />
      <section className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-sm text-teal-400">{t(admin ? "ops.admin" : "ops.officer")}</p>
            <h1 className="text-3xl font-bold">{t(admin ? "ops.system" : "ops.overview")}</h1>
          </div>
          <button
            className="rounded-md border border-border px-4 py-2"
            onClick={() => {
              setErrors([]);
              setHealth(null);
              setUsers(null);
              setSos(null);
              setRevision((value) => value + 1);
            }}
          >
            {t("cta.retry")}
          </button>
        </div>

        {!admin && (
          <div className="rounded-xl border border-border p-4">
            <h2 className="font-semibold">{t("ops.region")}</h2>
            <p>{user?.operationalRegion || location?.label || t("chat.unavailable")}</p>
            <Link className="text-teal-400 underline" to="/location">
              {t("loc.manual")}
            </Link>
          </div>
        )}

        {errors.map((key) => (
          <p role="alert" key={key} className="rounded-xl border border-red-500/40 p-4 text-red-400">
            {t(key as TKey)}: {t("state.liveUnavailable")}
          </p>
        ))}

        {actionError && (
          <p role="alert" className="rounded-xl border border-red-500/40 p-4 text-red-400">
            {actionError}
          </p>
        )}

        <div className={admin ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-4"}>
          {metric("ops.sos", sos?.length)}
          {admin && (
            <>
              {metric("ops.users", health?.registered_users_count)}
              {metric("ops.system", health ? state(health.overall_status) : undefined)}
            </>
          )}
        </div>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="text-lg font-semibold">{t("ops.sos")}</h2>
            {sos && sos.length > 0 && (
              <div className="flex gap-1.5 text-xs" role="group" aria-label="Filter SOS status">
                {(["ALL", "RECEIVED", "RESPONDING"] as const).map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    aria-pressed={statusFilter === filterVal}
                    onClick={() => setStatusFilter(filterVal)}
                    className={`rounded-md border px-2.5 py-1 font-medium ${
                      statusFilter === filterVal
                        ? "border-secondary bg-secondary/15 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {filterVal}
                  </button>
                ))}
              </div>
            )}
          </div>
          {visibleSos === null ? (
            <p className="p-4">{t(errors.includes("ops.sos") ? "chat.unavailable" : "state.loading")}</p>
          ) : visibleSos.length === 0 ? (
            <p className="p-6 text-muted-foreground">{t("ops.noSos")}</p>
          ) : (
            <div className="divide-y divide-border">
              {visibleSos.map((s) => (
                <IncidentCard
                  key={s.sos_id}
                  incident={s}
                  updating={updatingSosId === s.sos_id}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </section>

        {admin && users && (
          <section className="rounded-xl border border-border bg-card">
            <h2 className="p-4 text-lg font-semibold">{t("ops.accounts")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {["auth.name", "ops.role", "ops.contact"].map((key) => (
                      <th className="p-4" key={key}>
                        {t(key as TKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr className="border-t border-border" key={u.id}>
                      <td className="p-4">{u.name}</td>
                      <td className="p-4">{t(userRoleKey(u.role))}</td>
                      <td className="p-4">{u.email || u.mobile_number || t("chat.unavailable")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {admin && health?.services && (
          <section className="rounded-xl border border-border bg-card">
            <h2 className="p-4 text-lg font-semibold">{t("ops.health")}</h2>
            <div className="divide-y divide-border">
              {health.services.map((s: Service) => (
                <article key={s.service_name} className="space-y-3 p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>
                      {s.provider} · {t(`health.service.${s.service_id}` as TKey)}
                    </strong>
                    <span>{state(s.status)}</span>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {(
                      [
                        ["health.receiving", t(s.real_data_arriving ? "health.receivingYes" : "health.receivingNo")],
                        ["health.checked", date(s.last_checked)],
                        ["health.success", date(s.last_successful_response)],
                        ["health.failure", date(s.last_failure)],
                        [
                          "health.mode",
                          t(
                            s.data_mode === "live"
                              ? "state.live"
                              : s.data_mode === "fallback"
                                ? "health.fallback"
                                : s.data_mode === "stale"
                                  ? "health.stale"
                                  : "chat.unavailable",
                          ),
                        ],
                        ["state.updated", date(s.data_timestamp)],
                      ] as Array<[TKey, string]>
                    ).map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground">{t(label)}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {(s.last_error_summary || s.last_failure_reason || (s.http_status && s.http_status >= 400)) && (
                    <p className="break-words font-mono text-xs text-muted-foreground">
                      {s.last_error_summary === "NOT_YET_VERIFIED"
                        ? t("health.unknown")
                        : [s.last_error_summary, s.last_failure_reason]
                            .filter(Boolean)
                            .filter((value, index, values) => values.indexOf(value) === index)
                            .join(" · ")}
                      {s.http_status ? ` · HTTP ${s.http_status}` : ""}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {!admin && (
          <section className="rounded-xl border border-border p-5">
            <h2 className="font-semibold">{t("ops.communication")}</h2>
            <p className="mt-2 text-muted-foreground">{t("ops.communicationUnavailable")}</p>
          </section>
        )}
      </section>
    </AppShell>
  );
}
