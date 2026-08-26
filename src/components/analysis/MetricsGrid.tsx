import { severityColors } from "./display";
import type { GovGraphAnalysis, Severity } from "@/lib/govgraph/types";

export function MetricsGrid({ analysis }: { analysis: GovGraphAnalysis }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Metric label="Overall risk" value={analysis.summary.overallRisk} tone="critical" suffix="/100" />
      <Metric label="Open findings" value={analysis.summary.openFindings} tone="high" />
      <Metric label="Critical" value={analysis.summary.criticalFindings} tone="critical" />
      <Metric label="High" value={analysis.summary.highFindings} tone="high" />
      <Metric label="Medium" value={analysis.summary.mediumFindings} tone="medium" />
      <Metric label="Flows traced" value={analysis.summary.regulatedFlows} tone="low" />
    </section>
  );
}

function Metric({
  label,
  value,
  suffix = "",
  tone
}: {
  label: string;
  value: number;
  suffix?: string;
  tone: Severity;
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3 shadow-panel">
      <div className="text-xs font-medium uppercase text-[#697784]">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold" style={{ color: severityColors[tone] }}>
          {value}
        </span>
        {suffix ? <span className="text-sm text-[#697784]">{suffix}</span> : null}
      </div>
    </div>
  );
}

