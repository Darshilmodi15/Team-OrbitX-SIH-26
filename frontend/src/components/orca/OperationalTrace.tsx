import type { ChatEvidence } from "@/lib/orca/types";
import { useI18n } from "@/lib/orca/i18n";
import { traceCopy } from "@/lib/orca/trace-copy";
export function OperationalTrace({trace}:{trace:ChatEvidence["operational_trace"]}) {
  const {lang} = useI18n();
  const copy = (value:string) => traceCopy(lang,value);
  if (!trace?.length) return null;
  return <details className="operational-trace rounded-xl border p-3 text-sm">
    <summary className="cursor-pointer">{copy("title")}</summary>
    <p className="mt-2 text-muted-foreground">{copy("notice")}</p>
    <ol className="mt-3 border-l-2 border-teal-500 pl-4 space-y-3">{trace.map((node,index)=><li key={`${node.stage}-${index}`}>
      <strong>{copy(node.stage)}</strong> · {copy(node.status)}<br/>{node.provider}<br/>
      <small>{node.latency_ms == null ? "—" : `${node.latency_ms} ms`} · {node.timestamp}</small>
    </li>)}</ol>
  </details>;
}
