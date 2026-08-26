import type { DataFlowPath, GovGraphEdge, GovGraphNode, ScoredFlow } from "./types";

const SINK_WEIGHTS: Record<string, number> = {
  log_sink: 28,
  external_sink: 26,
  event_bus_topic: 18,
  db_table: 10,
  function: 6,
  module: 4,
  api_endpoint: 12
};

const FIELD_WEIGHTS: Record<string, number> = {
  SECRET: 30,
  FINANCIAL: 28,
  PII: 24,
  UNKNOWN: 6
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreFlows(
  flows: DataFlowPath[],
  edges: GovGraphEdge[],
  nodes: GovGraphNode[]
): ScoredFlow[] {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return flows.map((flow) => {
    const pathEdges = flow.edgeIds.map((id) => edgeById.get(id)).filter(Boolean) as GovGraphEdge[];
    const sink = nodeById.get(flow.sinkNodeId);
    const firstBoundaryIndex = pathEdges.findIndex((edge) => edge.crossesTrustBoundary);
    const distance = firstBoundaryIndex === -1 ? pathEdges.length + 1 : firstBoundaryIndex + 1;
    const hasUnencrypted = pathEdges.some((edge) => edge.encrypted === false);
    const hasUnknownEncryption = pathEdges.some((edge) => edge.encrypted === "unknown");

    const factors = {
      distanceToBoundary: Math.max(0, 22 - distance * 4),
      encryptionRisk: hasUnencrypted ? 24 : hasUnknownEncryption ? 12 : 0,
      sinkSeverity: SINK_WEIGHTS[sink?.type ?? "function"] ?? 6,
      fieldSensitivity: FIELD_WEIGHTS[flow.fieldClass] ?? 6,
      auditVisibility: flow.documented ? 0 : 14
    };

    const score = clampScore(
      factors.distanceToBoundary +
        factors.encryptionRisk +
        factors.sinkSeverity +
        factors.fieldSensitivity +
        factors.auditVisibility
    );

    const encryptionPhrase = hasUnencrypted
      ? "unencrypted"
      : hasUnknownEncryption
        ? "with unknown encryption coverage"
        : "with encryption evidence";
    const boundaryPhrase =
      firstBoundaryIndex === -1
        ? "without crossing an external trust boundary"
        : `crosses a trust boundary after ${distance} hop${distance === 1 ? "" : "s"}`;

    return {
      pathId: flow.pathId,
      score,
      rationale: `${flow.fieldName} (${flow.fieldClass}) flows ${encryptionPhrase} to ${sink?.name ?? "an unknown sink"} and ${boundaryPhrase}. ${flow.documented ? "Existing audit evidence was found." : "No audit annotation was found."}`,
      factors
    };
  });
}
