import { CheckCircle2 } from "lucide-react";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

export function RemediationWorkspace({ analysis }: { analysis: GovGraphAnalysis }) {
  const findingById = new Map(analysis.findings.map((finding) => [finding.id, finding]));

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-risk-low" />
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
                  <p className="mt-1 text-xs text-text-secondary">{finding?.regulation}</p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                    remediation.confidence === "high"
                      ? "bg-risk-low/15 text-risk-low"
                      : "bg-risk-medium/15 text-risk-medium"
                  }`}
                  style={remediation.confidence === "high" ? { boxShadow: `0 0 8px ${severityGreen}30` } : undefined}
                >
                  {remediation.confidence === "high" ? "PR ready" : "Review"}
                </span>
              </div>
              <pre className="mt-3 max-h-44 overflow-auto rounded-md border border-line bg-mist p-3 font-mono text-xs leading-5 shadow-[inset_0_1px_8px_rgba(0,0,0,0.35)]">
                {remediation.patch.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+")
                        ? "text-risk-low"
                        : line.startsWith("-")
                          ? "text-risk-critical"
                          : "text-text-secondary"
                    }
                  >
                    {line}
                  </div>
                ))}
              </pre>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{remediation.rationale}</p>
              <div className="mt-3 flex gap-2">
                <button className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-glow hover:shadow-glow">
                  Approve &amp; Open PR
                </button>
                <button className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-accent/40 hover:bg-elevated hover:text-ink">
                  Dismiss
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const severityGreen = "#3abf7a";
