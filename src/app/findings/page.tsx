import { FeatureHeader } from "@/components/analysis/FeatureHeader";
import { FindingsWorkspace } from "@/components/analysis/FindingsWorkspace";
import { PolicyDistributionPanel } from "@/components/analysis/PolicyDistributionPanel";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";

export default async function FindingsPage() {
  const analysis = await getLatestAnalysis();

  return (
    <main>
      <FeatureHeader
        analysis={analysis}
        eyebrow="Findings"
        title="Triage policy violations with code evidence"
        description="Prioritize open compliance risk by severity, regulation, data field, and the exact path sensitive data follows."
      />
      <div className="mx-auto grid max-w-[1480px] gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <FindingsWorkspace analysis={analysis} />
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Stat label="Open findings" value={analysis.summary.openFindings} />
            <Stat label="Critical" value={analysis.summary.criticalFindings} />
            <Stat label="High" value={analysis.summary.highFindings} />
          </div>
          <PolicyDistributionPanel analysis={analysis} />
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3 shadow-panel">
      <div className="text-xs font-medium uppercase text-[#697784]">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
