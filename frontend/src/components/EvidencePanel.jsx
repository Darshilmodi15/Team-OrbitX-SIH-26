import React from 'react';
import MarineMetrics from './MarineMetrics';
import AgentTrace from './AgentTrace';

export default function EvidencePanel({ weather, riskLevel, plan, reasoning, sourcesUsed }) {
  if (!weather && !plan && (!reasoning || reasoning.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-2">
      {weather && <MarineMetrics weather={weather} riskLevel={riskLevel} />}
      <AgentTrace plan={plan} reasoning={reasoning} sourcesUsed={sourcesUsed} />
    </div>
  );
}
