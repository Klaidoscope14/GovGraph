import type {
  DataFlowPath,
  GovGraphEdge,
  GovGraphNode,
  PolicyCondition,
  PolicyRule,
  PolicySubject,
  ScoredFlow,
  Violation
} from "./types";
import { generateNarrative } from "./narrative";

export const starterRules: PolicyRule[] = [
  {
    id: "gdpr-art32-encryption",
    regulation: "GDPR Article 32",
    description: "Personal data must be protected with appropriate encryption controls.",
    severity: "high",
    condition: {
      all: [
        { field: "fieldClass", op: "in", value: ["PII", "FINANCIAL", "SECRET"] },
        { field: "encrypted", op: "eq", value: false },
        { field: "crossesTrustBoundary", op: "eq", value: true }
      ]
    }
  },
  {
    id: "soc2-cc6-6-sensitive-data-encryption",
    regulation: "SOC2 CC6.6",
    description: "Sensitive data should be encrypted before it reaches external systems.",
    severity: "high",
    condition: {
      all: [
        { field: "score", op: "gte", value: 70 },
        { field: "encrypted", op: "eq", value: false }
      ]
    }
  },
  {
    id: "gdpr-art30-records-of-processing",
    regulation: "GDPR Article 30",
    description: "Sensitive processing flows should be documented for audit readiness.",
    severity: "medium",
    condition: {
      all: [
        { field: "fieldClass", op: "in", value: ["PII", "FINANCIAL", "SECRET"] },
        { field: "documented", op: "eq", value: false }
      ]
    }
  },
  {
    id: "soc2-cc7-2-undocumented-flow",
    regulation: "SOC2 CC7.2",
    description: "Undocumented high-risk flows should be reviewed for monitoring gaps.",
    severity: "medium",
    condition: {
      all: [
        { field: "score", op: "gte", value: 60 },
        { field: "documented", op: "eq", value: false }
      ]
    }
  },
  {
    id: "gdpr-art5-integrity-confidentiality",
    regulation: "GDPR Article 5(1)(f)",
    description: "Personal data should not be exposed to logs or telemetry without safeguards.",
    severity: "critical",
    condition: {
      all: [
        { field: "fieldClass", op: "eq", value: "PII" },
        { field: "sinkType", op: "eq", value: "log_sink" }
      ]
    }
  }
];

function compare(left: unknown, op: NonNullable<PolicyCondition["op"]>, right: unknown) {
  switch (op) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "in":
      return Array.isArray(right) && right.includes(String(left));
    case "includes":
      return Array.isArray(left) && left.includes(right);
    default:
      return false;
  }
}

export function evaluateCondition(condition: PolicyCondition, subject: PolicySubject): boolean {
  if (condition.all) return condition.all.every((item) => evaluateCondition(item, subject));
  if (condition.any) return condition.any.some((item) => evaluateCondition(item, subject));
  if (!condition.field || !condition.op) return false;
  return compare(subject[condition.field], condition.op, condition.value);
}

export function evaluatePolicies(
  flows: DataFlowPath[],
  scoredFlows: ScoredFlow[],
  nodes: GovGraphNode[],
  edges: GovGraphEdge[],
  rules: PolicyRule[] = starterRules
): Violation[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const scoreByPath = new Map(scoredFlows.map((score) => [score.pathId, score]));

  return flows.flatMap((flow) => {
    const pathEdges = flow.edgeIds.map((id) => edgeById.get(id)).filter(Boolean) as GovGraphEdge[];
    const sink = nodeById.get(flow.sinkNodeId);
    const scored = scoreByPath.get(flow.pathId);
    const encrypted = pathEdges.some((edge) => edge.encrypted === false)
      ? false
      : pathEdges.some((edge) => edge.encrypted === "unknown")
        ? "unknown"
        : true;

    const subject: PolicySubject = {
      pathId: flow.pathId,
      fieldClass: flow.fieldClass,
      fieldName: flow.fieldName,
      encrypted,
      crossesTrustBoundary: pathEdges.some((edge) => edge.crossesTrustBoundary),
      sinkType: sink?.type ?? "function",
      sinkName: sink?.name ?? "unknown sink",
      score: scored?.score ?? 0,
      documented: flow.documented
    };

    return rules
      .filter((rule) => evaluateCondition(rule.condition, subject))
      .map((rule) => {
        const path = buildPath(flow, pathEdges, nodeById);
        return {
          id: `${flow.pathId}:${rule.id}`,
          pathId: flow.pathId,
          ruleId: rule.id,
          regulation: rule.regulation,
          severity: rule.severity,
          score: scored?.score ?? 0,
          narrative: generateNarrative(flow, rule, path, scored?.rationale ?? ""),
          status: "open",
          evidence: {
            fieldName: flow.fieldName,
            fieldClass: flow.fieldClass,
            path,
            rationale: scored?.rationale ?? "",
            ruleDescription: rule.description
          }
        } satisfies Violation;
      });
  });
}

function buildPath(
  flow: DataFlowPath,
  pathEdges: GovGraphEdge[],
  nodeById: Map<string, GovGraphNode>
) {
  const names = [nodeById.get(flow.sourceNodeId)?.name ?? flow.sourceNodeId];
  for (const edge of pathEdges) {
    names.push(nodeById.get(edge.targetNodeId)?.name ?? edge.targetNodeId);
  }
  return names;
}
