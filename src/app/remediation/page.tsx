import { FeatureHeader } from "@/components/analysis/FeatureHeader";
import { RemediationWorkspace } from "@/components/analysis/RemediationWorkspace";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";

export default async function RemediationPage() {
  const analysis = await getLatestAnalysis();
  const highConfidence = analysis.remediations.filter((item) => item.confidence === "high").length;
  const needsReview = analysis.remediations.length - highConfidence;

  return (
    <main>
      <FeatureHeader
        analysis={analysis}
        eyebrow="Remediation"
        title="Review confidence-gated fix previews"
        description="Separate safe automated patches from changes that need a human reviewer before opening a pull request."
      />
      <div className="mx-auto grid max-w-[1480px] gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RemediationWorkspace analysis={analysis} />
        <aside className="space-y-3">
          <Stat label="PR-ready fixes" value={highConfidence} />
          <Stat label="Needs review" value={needsReview} />
          <Stat label="Total previews" value={analysis.remediations.length} />
        </aside>
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

