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
        eyebrow="Executive Overview"
        title="Governance posture across sensitive code paths"
        description="A focused command center for risk, policy violations, data-flow evidence, and confidence-gated remediation."
        action={
          <>
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
          </>
        }
      />

      <div className="mx-auto max-w-[1480px] px-5 py-5">
        <MetricsGrid analysis={analysis} />

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.55fr)]">
          <DataFlowGraphPanel analysis={analysis} />
          <PolicyDistributionPanel analysis={analysis} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <FindingsWorkspace analysis={analysis} compact />
          <RemediationWorkspace analysis={analysis} />
        </section>
      </div>
    </main>
  );
}

