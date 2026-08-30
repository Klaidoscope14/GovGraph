import { severityColors } from "./display";
import type { GovGraphAnalysis, Severity } from "@/lib/govgraph/types";

export function MetricsGrid({ analysis }: { analysis: GovGraphAnalysis }) {
  return (
    <section className="grid animate-fade-in gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <RiskGauge score={analysis.summary.overallRisk} />
      <Metric label="Open findings" value={analysis.summary.openFindings} tone="high" />
      <Metric label="Critical" value={analysis.summary.criticalFindings} tone="critical" />
      <Metric label="High" value={analysis.summary.highFindings} tone="high" />
      <Metric label="Medium" value={analysis.summary.mediumFindings} tone="medium" />
      <Metric label="Flows traced" value={analysis.summary.regulatedFlows} tone="low" />
    </section>
  );
}

function RiskGauge({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? severityColors.critical : score >= 60 ? severityColors.high : score >= 40 ? severityColors.medium : severityColors.low;

  return (
    <div className="glass-card flex flex-col items-center justify-center px-4 py-3 transition-colors hover:border-accent/30">
      <div className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">Overall risk</div>
      <div className="relative mt-2">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#2a3040" strokeWidth="6" />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90 44 44)"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)`, transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-metric text-2xl font-semibold" style={{ color }}>{score}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: Severity;
}) {
  return (
    <div className="glass-card px-4 py-3 transition-colors hover:border-accent/30">
      <div className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-metric text-3xl font-semibold" style={{ color: severityColors[tone] }}>
          {value}
        </span>
      </div>
    </div>
  );
}
