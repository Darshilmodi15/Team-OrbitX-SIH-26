import type { ChatEvidence } from "@/lib/orca/types";
export function OperationalTrace({trace}:{trace:ChatEvidence["operational_trace"]}) {
  if (!trace?.length) return null;
  return <details className="operational-trace rounded-xl border p-3 text-sm">
    <summary className="cursor-pointer">How ORCA reached this answer</summary>
    <p className="mt-2 text-muted-foreground">Operational events and evidence only.</p>
    <ol className="mt-3 border-l-2 border-teal-500 pl-4 space-y-3">{trace.map((node,index)=><li key={`${node.stage}-${index}`}>
      <strong>{node.stage}</strong> · {node.status}<br/>{node.provider}{node.detail ? ` · ${node.detail}` : ""}<br/>
      <small>{node.latency_ms == null ? "Timing not measured for this saved result" : `${node.latency_ms} ms`} · {node.timestamp}</small>
    </li>)}</ol>
  </details>;
}
