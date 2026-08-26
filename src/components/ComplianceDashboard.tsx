"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  GitBranch,
  Play,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { GovGraphAnalysis, Severity } from "@/lib/govgraph/types";

const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const severityColors: Record<Severity, string> = {
  critical: "#b73144",
  high: "#d85b41",
  medium: "#d59d23",
  low: "#2f9e6d"
};

const nodeColors: Record<string, string> = {
  function: "#ffffff",
  module: "#eef5f3",
  db_table: "#f5f0e6",
  api_endpoint: "#eaf0f7",
  external_sink: "#fff0ea",
  event_bus_topic: "#f0edf7",
  log_sink: "#fff2f4"
};

export function ComplianceDashboard({
  initialAnalysis
}: {
  initialAnalysis: GovGraphAnalysis;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | "all">("all");
  const [isScanning, setIsScanning] = useState(false);

  const filteredFindings = useMemo(() => {
    return analysis.findings
      .filter((finding) => selectedSeverity === "all" || finding.severity === selectedSeverity)
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.score - a.score);
  }, [analysis.findings, selectedSeverity]);

  const findingById = useMemo(() => {
    return new Map(analysis.findings.map((finding) => [finding.id, finding]));
  }, [analysis.findings]);

  const graph = useMemo(() => buildFlowGraph(analysis), [analysis]);
  const chartData = useMemo(() => buildChartData(analysis), [analysis]);

  async function runScan() {
    setIsScanning(true);
    const response = await fetch("/api/scan", { method: "POST" });
    const nextAnalysis = (await response.json()) as GovGraphAnalysis;
    setAnalysis(nextAnalysis);
    setIsScanning(false);
  }

  return (
    <main className="min-h-screen bg-mist text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-line bg-[#eef5f3]">
                <ShieldCheck className="h-5 w-5 text-[#25795f]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">GovGraph</h1>
                <p className="text-sm text-[#5f6d79]">
                  {analysis.repository.name} / {analysis.repository.branch} / {analysis.repository.commitSha}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium hover:bg-[#f0f3f6]"
              href="/api/report"
            >
              <Download className="h-4 w-4" />
              CSV
            </a>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-[#263544] disabled:opacity-65"
              disabled={isScanning}
              onClick={runScan}
            >
              <Play className="h-4 w-4" />
              {isScanning ? "Scanning" : "Run scan"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Metric label="Overall risk" value={analysis.summary.overallRisk} tone="critical" suffix="/100" />
          <Metric label="Open findings" value={analysis.summary.openFindings} tone="high" />
          <Metric label="Critical" value={analysis.summary.criticalFindings} tone="critical" />
          <Metric label="High" value={analysis.summary.highFindings} tone="high" />
          <Metric label="Medium" value={analysis.summary.mediumFindings} tone="medium" />
          <Metric label="Flows traced" value={analysis.summary.regulatedFlows} tone="low" />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <div className="min-h-[530px] rounded-lg border border-line bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[#486474]" />
                <h2 className="text-sm font-semibold">Sensitive Data Flow Graph</h2>
              </div>
              <span className="rounded-md border border-line px-2 py-1 text-xs text-[#5f6d79]">
                {analysis.nodes.length} nodes / {analysis.edges.length} edges
              </span>
            </div>
            <div className="h-[474px]">
              <ReactFlow
                nodes={graph.nodes}
                edges={graph.edges}
                fitView
                minZoom={0.35}
                maxZoom={1.5}
                nodesDraggable
              >
                <Background color="#d8dee5" gap={18} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white shadow-panel">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <ShieldAlert className="h-4 w-4 text-[#b73144]" />
              <h2 className="text-sm font-semibold">Policy Distribution</h2>
            </div>
            <div className="h-[250px] px-2 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#edf0f2" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "#f5f7f9" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="border-t border-line p-4">
              <h3 className="text-sm font-semibold">Risk Factors</h3>
              <div className="mt-3 space-y-3">
                {analysis.scoredFlows.slice(0, 5).map((flow) => (
                  <div key={flow.pathId}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="max-w-[230px] truncate text-[#5f6d79]">{flow.pathId}</span>
                      <span className="font-semibold">{flow.score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#edf0f2]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${flow.score}%`,
                          backgroundColor: flow.score >= 80 ? severityColors.critical : flow.score >= 70 ? severityColors.high : severityColors.medium
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-lg border border-line bg-white shadow-panel">
            <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#d85b41]" />
                <h2 className="text-sm font-semibold">Findings</h2>
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#5f6d79]" />
                <select
                  className="h-9 rounded-md border border-line bg-white px-2 text-sm"
                  value={selectedSeverity}
                  onChange={(event) => setSelectedSeverity(event.target.value as Severity | "all")}
                >
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-line">
              {filteredFindings.map((finding) => (
                <article key={finding.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[120px_1fr_82px]">
                  <div>
                    <span
                      className="inline-flex rounded-md px-2 py-1 text-xs font-semibold uppercase text-white"
                      style={{ backgroundColor: severityColors[finding.severity] }}
                    >
                      {finding.severity}
                    </span>
                    <div className="mt-2 text-xs text-[#5f6d79]">{finding.regulation}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{finding.evidence.fieldName}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#3f4d59]">{finding.narrative}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {finding.evidence.path.map((step) => (
                        <span key={`${finding.id}:${step}`} className="rounded-md border border-line bg-[#f8fafb] px-2 py-1 text-xs">
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold">{finding.score}</div>
                    <div className="text-xs text-[#5f6d79]">risk</div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-line bg-white shadow-panel">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-[#25795f]" />
              <h2 className="text-sm font-semibold">Remediation Preview</h2>
            </div>
            <div className="divide-y divide-line">
              {analysis.remediations.map((remediation) => {
                const finding = findingById.get(remediation.findingId);
                return (
                  <article key={remediation.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{remediation.strategy}</h3>
                        <p className="mt-1 text-xs text-[#5f6d79]">{finding?.regulation}</p>
                      </div>
                      <span
                        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: remediation.confidence === "high" ? "#e6f4ee" : "#fff4db",
                          color: remediation.confidence === "high" ? "#25795f" : "#896515"
                        }}
                      >
                        {remediation.confidence === "high" ? "PR ready" : "Review"}
                      </span>
                    </div>
                    <pre className="mt-3 max-h-44 overflow-auto rounded-md border border-line bg-[#111820] p-3 text-xs leading-5 text-[#dfe7ed]">
                      {remediation.patch}
                    </pre>
                    <p className="mt-3 text-sm leading-6 text-[#3f4d59]">{remediation.rationale}</p>
                  </article>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
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

function buildFlowGraph(analysis: GovGraphAnalysis): { nodes: Node[]; edges: Edge[] } {
  const scoreByPath = new Map(analysis.scoredFlows.map((flow) => [flow.pathId, flow.score]));
  const columns = new Map<string, number>([
    ["api_endpoint", 0],
    ["function", 1],
    ["module", 1],
    ["db_table", 0],
    ["event_bus_topic", 2],
    ["log_sink", 3],
    ["external_sink", 3]
  ]);
  const typeCounts = new Map<string, number>();

  const nodes: Node[] = analysis.nodes.map((node) => {
    const column = columns.get(node.type) ?? 1;
    const count = typeCounts.get(node.type) ?? 0;
    typeCounts.set(node.type, count + 1);

    return {
      id: node.id,
      position: {
        x: column * 275 + 40,
        y: count * 92 + (node.type === "module" ? 35 : 0)
      },
      data: {
        label: (
          <div className="w-[178px]">
            <div className="truncate font-semibold">{node.name}</div>
            <div className="mt-1 truncate text-[11px] text-[#697784]">{node.type.replaceAll("_", " ")}</div>
          </div>
        )
      },
      style: {
        background: nodeColors[node.type] ?? "#ffffff",
        color: "#17212b",
        borderColor: node.type === "log_sink" || node.type === "external_sink" ? "#d85b41" : "#cfd7df",
        width: 200,
        minHeight: 58
      }
    };
  });

  const edges: Edge[] = analysis.edges.map((edge) => {
    const score = scoreByPath.get(edge.pathId) ?? 0;
    const color = score >= 80 ? severityColors.critical : score >= 70 ? severityColors.high : score >= 50 ? severityColors.medium : severityColors.low;
    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: `${edge.fieldName} ${score}`,
      animated: score >= 75,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: {
        stroke: color,
        strokeWidth: score >= 75 ? 2.6 : 1.6
      },
      labelStyle: {
        fill: "#17212b",
        fontSize: 11,
        fontWeight: 600
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.88
      }
    };
  });

  return { nodes, edges };
}

function buildChartData(analysis: GovGraphAnalysis) {
  const severities: Severity[] = ["critical", "high", "medium", "low"];
  const counts = new Map<Severity, number>(severities.map((severity) => [severity, 0]));

  for (const finding of analysis.findings) {
    counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
  }

  return severities.map((severity) => ({
    label: severity[0].toUpperCase() + severity.slice(1),
    count: counts.get(severity) ?? 0,
    color: severityColors[severity]
  }));
}
