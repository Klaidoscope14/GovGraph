import { DataFlowGraphPanel } from "@/components/analysis/DataFlowGraphPanel";
import { FeatureHeader } from "@/components/analysis/FeatureHeader";
import { severityColors } from "@/components/analysis/display";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";

export default async function GraphPage() {
  const analysis = await getLatestAnalysis();
  const nodeById = new Map(analysis.nodes.map((node) => [node.id, node]));

  return (
    <main>
      <FeatureHeader
        analysis={analysis}
        eyebrow="Graph Explorer"
        title="Trace sensitive data from source to sink"
        description="Inspect how regulated fields move through handlers, services, storage, logs, and external integrations."
      />
      <div className="mx-auto grid max-w-[1480px] gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <DataFlowGraphPanel analysis={analysis} heightClassName="h-[690px]" />
        <aside className="rounded-lg border border-line bg-white shadow-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Highest Risk Flows</h2>
          </div>
          <div className="divide-y divide-line">
            {analysis.scoredFlows.slice(0, 8).map((flow) => {
              const path = analysis.flows.find((item) => item.pathId === flow.pathId);
              const sink = path ? nodeById.get(path.sinkNodeId) : null;

              return (
                <article className="px-4 py-4" key={flow.pathId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{path?.fieldName ?? flow.pathId}</h3>
                      <p className="mt-1 text-xs text-[#5f6d79]">{sink?.name ?? "Unknown sink"}</p>
                    </div>
                    <span
                      className="rounded-md px-2 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor:
                          flow.score >= 80
                            ? severityColors.critical
                            : flow.score >= 70
                              ? severityColors.high
                              : severityColors.medium
                      }}
                    >
                      {flow.score}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#3f4d59]">{flow.rationale}</p>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}

