import { DataFlowExplorer } from "@/components/analysis/DataFlowExplorer";
import { FeatureHeader } from "@/components/analysis/FeatureHeader";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";

export default async function DataFlowPage() {
  const analysis = await getLatestAnalysis();

  return (
    <main className="flex h-[calc(100dvh-64px)] flex-col overflow-hidden sm:h-[calc(100vh-73px)]">
      <FeatureHeader
        analysis={analysis}
        eyebrow="Data Flow Explorer"
        title="Trace sensitive data through the codebase"
        description="Modules start collapsed as spheres — click one to reveal its files and functions, then start tracing to animate real data-flow paths."
      />
      <div className="mx-auto min-h-0 w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-5 sm:py-5">
        <DataFlowExplorer analysis={analysis} />
      </div>
    </main>
  );
}
