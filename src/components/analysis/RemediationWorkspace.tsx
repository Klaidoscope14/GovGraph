import { CheckCircle2 } from "lucide-react";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

export function RemediationWorkspace({ analysis }: { analysis: GovGraphAnalysis }) {
  const findingById = new Map(analysis.findings.map((finding) => [finding.id, finding]));

  return (
    <div className="rounded-lg border border-line bg-white shadow-panel">
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
    </div>
  );
}

