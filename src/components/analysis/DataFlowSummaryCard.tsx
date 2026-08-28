import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, GitBranch } from "lucide-react";
import { severityColors } from "./display";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

export function DataFlowSummaryCard({ analysis }: { analysis: GovGraphAnalysis }) {
  const critical = analysis.summary.criticalFindings;
  const high = analysis.summary.highFindings;

  return (
    <div className="glass-card flex flex-col justify-between p-5">
      <div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Sensitive Data Flow Graph</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-text-secondary">
          Explore how sensitive fields move from entry points through processing to storage,
          events, and sinks — as an interactive, expandable 3D map with live data tracing.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Stat label="Nodes" value={analysis.nodes.length} />
          <Stat label="Edges" value={analysis.edges.length} />
          <Stat label="Critical flows" value={critical} color={severityColors.critical} />
          <Stat label="High flows" value={high} color={severityColors.high} />
        </div>
      </div>
      <Link
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-glow"
        href={"/dashboard/data-flow" as Route}
      >
        Open Data Flow Explorer
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2">
      <div className="text-[10px] uppercase text-text-secondary">{label}</div>
      <div className="mt-0.5 font-metric text-lg font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
