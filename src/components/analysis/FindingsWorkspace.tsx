"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { severityColors, severityRank } from "./display";
import type { GovGraphAnalysis, Severity } from "@/lib/govgraph/types";

export function FindingsWorkspace({
  analysis,
  compact = false
}: {
  analysis: GovGraphAnalysis;
  compact?: boolean;
}) {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | "all">("all");

  const filteredFindings = useMemo(() => {
    return analysis.findings
      .filter((finding) => selectedSeverity === "all" || finding.severity === selectedSeverity)
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.score - a.score);
  }, [analysis.findings, selectedSeverity]);

  const visibleFindings = compact ? filteredFindings.slice(0, 8) : filteredFindings;

  return (
    <div className="rounded-lg border border-line bg-white shadow-panel">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#d85b41]" />
          <h2 className="text-sm font-semibold">Findings</h2>
          <span className="rounded-md border border-line px-2 py-1 text-xs text-[#5f6d79]">
            {filteredFindings.length}
          </span>
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
        {visibleFindings.map((finding) => (
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
  );
}

