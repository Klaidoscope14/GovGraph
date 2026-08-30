"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { severityColors, severityRank } from "./display";
import type { GovGraphAnalysis, Severity, Violation } from "@/lib/govgraph/types";

export function FindingsWorkspace({
  analysis,
  compact = false
}: {
  analysis: GovGraphAnalysis;
  compact?: boolean;
}) {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFindings = useMemo(() => {
    return analysis.findings
      .filter((finding) => selectedSeverity === "all" || finding.severity === selectedSeverity)
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.score - a.score);
  }, [analysis.findings, selectedSeverity]);

  const visibleFindings = compact ? filteredFindings.slice(0, 8) : filteredFindings;
  const scoredFlowByPath = new Map(analysis.scoredFlows.map((f) => [f.pathId, f]));

  return (
    <div className="glass-card">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-risk-high" />
          <h2 className="text-sm font-semibold">Findings</h2>
          <span className="rounded-md border border-line bg-elevated px-2 py-1 text-xs text-text-secondary">
            {filteredFindings.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-text-secondary" />
          <select
            className="h-9 cursor-pointer rounded-md border border-line bg-surface px-2 text-sm text-ink transition-colors hover:border-accent/40"
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
        {visibleFindings.map((finding) => {
          const isExpanded = expandedId === finding.id;
          const scored = scoredFlowByPath.get(finding.pathId);
          return (
            <article key={finding.id}>
              <div
                className="grid cursor-pointer gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-elevated/50 sm:grid-cols-[110px_1fr_72px] lg:grid-cols-[120px_1fr_82px]"
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
              >
                <div>
                  <span
                    className="inline-flex rounded-md px-2 py-1 text-xs font-semibold uppercase text-white"
                    style={{
                      backgroundColor: severityColors[finding.severity],
                      boxShadow: finding.severity === "critical" ? `0 0 8px ${severityColors.critical}40` : undefined
                    }}
                  >
                    {finding.severity}
                  </span>
                  <div className="mt-2 text-xs text-text-secondary">{finding.regulation}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-text-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-text-secondary" />}
                    <h3 className="text-sm font-semibold">{finding.evidence.fieldName}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{finding.narrative}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {finding.evidence.path.map((step) => (
                      <span key={`${finding.id}:${step}`} className="rounded-md border border-line bg-elevated px-2 py-1 text-xs">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-metric text-2xl font-semibold">{finding.score}</div>
                  <div className="text-xs text-text-secondary">risk</div>
                </div>
              </div>
              {isExpanded && scored && <FactorBreakdown finding={finding} factors={scored.factors} />}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FactorBreakdown({
  finding,
  factors
}: {
  finding: Violation;
  factors: { distanceToBoundary: number; encryptionRisk: number; sinkSeverity: number; fieldSensitivity: number; auditVisibility: number };
}) {
  const items = [
    { label: "Distance to boundary", value: factors.distanceToBoundary, max: 22 },
    { label: "Encryption risk", value: factors.encryptionRisk, max: 24 },
    { label: "Sink severity", value: factors.sinkSeverity, max: 28 },
    { label: "Field sensitivity", value: factors.fieldSensitivity, max: 30 },
    { label: "Audit visibility", value: factors.auditVisibility, max: 14 }
  ];

  return (
    <div className="animate-fade-in border-t border-line bg-elevated/30 px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase text-text-secondary">Scoring Factors</h4>
          <div className="mt-3 space-y-2.5">
            {items.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{item.label}</span>
                  <span className="font-metric font-semibold">{item.value}/{item.max}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(item.value / item.max) * 100}%`,
                      backgroundColor: item.value / item.max > 0.7 ? severityColors.critical : item.value / item.max > 0.4 ? severityColors.medium : severityColors.low
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase text-text-secondary">Rule Match</h4>
          <div className="mt-3 rounded-md border border-line bg-surface p-3 text-sm">
            <div className="font-semibold text-accent">{finding.regulation}</div>
            <p className="mt-1 text-text-secondary">{finding.evidence.ruleDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
