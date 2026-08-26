"use client";

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
import { ShieldAlert } from "lucide-react";
import { severityColors } from "./display";
import type { GovGraphAnalysis, Severity } from "@/lib/govgraph/types";

export function PolicyDistributionPanel({ analysis }: { analysis: GovGraphAnalysis }) {
  const chartData = buildChartData(analysis);

  return (
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
        <h3 className="text-sm font-semibold">Top Risk Factors</h3>
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
                    backgroundColor:
                      flow.score >= 80
                        ? severityColors.critical
                        : flow.score >= 70
                          ? severityColors.high
                          : severityColors.medium
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

