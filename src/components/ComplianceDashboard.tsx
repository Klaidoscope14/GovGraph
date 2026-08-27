"use client";

import { useState } from "react";
import { Download, Play } from "lucide-react";
import { DataFlowGraphPanel } from "./analysis/DataFlowGraphPanel";
import { FeatureHeader } from "./analysis/FeatureHeader";
import { FindingsWorkspace } from "./analysis/FindingsWorkspace";
import { MetricsGrid } from "./analysis/MetricsGrid";
import { PolicyDistributionPanel } from "./analysis/PolicyDistributionPanel";
import { RemediationWorkspace } from "./analysis/RemediationWorkspace";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

export function ComplianceDashboard({
  initialAnalysis
}: {
  initialAnalysis: GovGraphAnalysis;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [isScanning, setIsScanning] = useState(false);

  async function runScan() {
    setIsScanning(true);
    const response = await fetch("/api/scan", { method: "POST" });
    const nextAnalysis = (await response.json()) as GovGraphAnalysis;
    setAnalysis(nextAnalysis);
    setIsScanning(false);
  }

  return (
    <main>
      <FeatureHeader
        analysis={analysis}
        eyebrow="Governance Dashboard"
        title="Compliance posture across sensitive code paths"
        description="Risk scoring, policy violations, data-flow evidence, and confidence-gated remediation — all in one view."
        action={
          <>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
              href="/api/report"
            >
              <Download className="h-4 w-4" />
              CSV
            </a>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
              href="/api/report?format=json"
            >
              <Download className="h-4 w-4" />
              JSON
            </a>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white transition-colors hover:bg-accent-glow disabled:opacity-50"
              disabled={isScanning}
              onClick={runScan}
            >
              <Play className="h-4 w-4" />
              {isScanning ? "Scanning..." : "Re-scan"}
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-[1480px] px-5 py-5">
        <MetricsGrid analysis={analysis} />

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <DataFlowGraphPanel analysis={analysis} heightClassName="h-[520px]" />
          <PolicyDistributionPanel analysis={analysis} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <FindingsWorkspace analysis={analysis} />
          <RemediationWorkspace analysis={analysis} />
        </section>
      </div>
    </main>
  );
}
