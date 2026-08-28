import { classifyFieldName, extractSensitiveFields } from "./sensitive-classifier";
import type {
  DataFlowPath,
  EncryptionState,
  FieldClass,
  GovGraphEdge,
  GovGraphNode,
  LatentGraphDependencySummary,
  LatentGraphFileSummary,
  LatentGraphFixture,
  NodeType
} from "./types";

export interface NormalizedGraph {
  nodes: GovGraphNode[];
  edges: GovGraphEdge[];
  flows: DataFlowPath[];
}

export function normalizeLatentGraphFixture(
  fixture: LatentGraphFixture,
  semanticHints?: Map<string, FieldClass>
): NormalizedGraph {
  const nodes = new Map<string, GovGraphNode>();
  const edges: GovGraphEdge[] = [];

  for (const module of fixture.overview.top_level_modules) {
    nodes.set(`module:${module.path}`, {
      id: `module:${module.path}`,
      type: "module",
      name: module.path,
      metadata: {
        module: module.path,
        label: module.summary
      }
    });
  }

  for (const file of fixture.files) {
    for (const node of fileToNodes(file)) {
      nodes.set(node.id, node);
    }
  }

  for (const dep of fixture.dependencies) {
    const depPath = dep.path ?? "unknown";
    for (const outgoing of dep.outgoing ?? []) {
      const sourceFile = fixture.files.find((file) => file.path === depPath);
      const targetFile = fixture.files.find((file) => file.path === outgoing.target);
      const sourceNodeId = preferredNodeId(sourceFile, depPath);
      const targetNodeId = preferredNodeId(targetFile, outgoing.target, outgoing.data_flow);

      if (!nodes.has(sourceNodeId)) nodes.set(sourceNodeId, fileFallbackNode(depPath));
      if (!nodes.has(targetNodeId)) nodes.set(targetNodeId, fileFallbackNode(outgoing.target));

      const text = [outgoing.summary, outgoing.data_flow, targetFile?.summary].filter(Boolean).join(" ");
      const sensitiveFields = extractSensitiveFields(text, semanticHints);
      const flowFields = sensitiveFields.length > 0 ? sensitiveFields : [{ name: "payload", fieldClass: "UNKNOWN" as FieldClass }];

      for (const [index, field] of flowFields.entries()) {
        const id = edgeId(depPath, outgoing.target, field.name, edges.length);
        const targetNode = nodes.get(targetNodeId);
        edges.push({
          id,
          sourceNodeId,
          targetNodeId,
          fieldName: normalizeFieldName(field.name),
          fieldClass: field.fieldClass,
          encrypted: inferEncryptionState(text, targetNode?.type),
          crossesTrustBoundary: crossesTrustBoundary(text, targetNode?.type),
          hopIndex: index,
          pathId: pathId(depPath, outgoing.target, field.name),
          evidence: outgoing.data_flow || outgoing.summary || "LatentGraph dependency edge"
        });
      }
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
    flows: groupEdgesIntoFlows(edges, [...nodes.values()])
  };
}

function fileToNodes(file: LatentGraphFileSummary): GovGraphNode[] {
  const nodes: GovGraphNode[] = [];
  const symbol = file.key_symbols?.[0];
  const primaryName = symbol?.name ?? file.path;

  nodes.push({
    id: `symbol:${symbol?.fqn ?? file.path}`,
    type: inferNodeType(file),
    name: primaryName,
    metadata: {
      filePath: file.path,
      language: inferLanguage(file.path),
      module: file.module_name,
      label: file.summary
    }
  });

  for (const endpoint of file.api_endpoints ?? []) {
    nodes.push({
      id: `endpoint:${endpoint.method}:${endpoint.path}`,
      type: "api_endpoint",
      name: `${endpoint.method} ${endpoint.path}`,
      metadata: {
        filePath: file.path,
        language: inferLanguage(file.path),
        module: file.module_name,
        label: endpoint.handler
      }
    });
  }

  for (const storage of file.storage_backends ?? []) {
    nodes.push({
      id: `storage:${storage.type}:${storage.hint}`,
      type: storage.type.toLowerCase().includes("s3") ? "external_sink" : "db_table",
      name: storage.hint,
      metadata: {
        filePath: file.path,
        module: file.module_name,
        label: storage.type
      }
    });
  }

  return nodes;
}

function preferredNodeId(
  file: LatentGraphFileSummary | undefined,
  filePath: string,
  dataFlow?: string
) {
  if (!file) return `file:${filePath}`;
  const storage = file.storage_backends?.[0];
  if (storage && /s3|bucket/i.test(storage.type + storage.hint) && /write|sink|external|s3/i.test(dataFlow ?? "")) {
    return `storage:${storage.type}:${storage.hint}`;
  }
  const symbol = file.key_symbols?.[0];
  return `symbol:${symbol?.fqn ?? file.path}`;
}

function fileFallbackNode(filePath: string): GovGraphNode {
  return {
    id: `file:${filePath}`,
    type: "function",
    name: filePath,
    metadata: {
      filePath,
      language: inferLanguage(filePath)
    }
  };
}

function inferNodeType(file: LatentGraphFileSummary): NodeType {
  const category = `${file.file_category ?? ""} ${file.summary ?? ""}`.toLowerCase();
  if (category.includes("api")) return "api_endpoint";
  if (category.includes("logger") || category.includes("logging") || category.includes("telemetry")) return "log_sink";
  if (category.includes("external") || category.includes("integration")) return "external_sink";
  return "function";
}

function inferLanguage(filePath: string) {
  const ext = filePath.split(".").at(-1);
  if (ext === "py") return "python";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "js" || ext === "jsx") return "javascript";
  if (ext === "cs") return "csharp";
  return ext ?? "unknown";
}

function inferEncryptionState(text: string, targetType?: NodeType): EncryptionState {
  if (/plaintext|unencrypted|without encryption|raw/i.test(text)) return false;
  if (/https|tls|encrypted|kms/i.test(text)) return true;
  if (targetType === "log_sink") return false;
  return "unknown";
}

function crossesTrustBoundary(text: string, targetType?: NodeType) {
  if (targetType === "external_sink" || targetType === "log_sink" || targetType === "event_bus_topic") return true;
  return /external|third-party|partner|s3|bucket|log|telemetry|event/i.test(text);
}

function normalizeFieldName(fieldName: string) {
  const lower = fieldName.toLowerCase();
  if (lower.includes("social")) return "ssn";
  if (lower.includes("policy_account")) return "policy_account_number";
  return fieldName;
}

function pathId(source: string, target: string, fieldName: string) {
  return `${source}->${target}:${normalizeFieldName(fieldName).toLowerCase()}`;
}

function edgeId(source: string, target: string, fieldName: string, index: number) {
  return `edge:${index}:${source}:${target}:${normalizeFieldName(fieldName).toLowerCase()}`;
}

function groupEdgesIntoFlows(edges: GovGraphEdge[], nodes: GovGraphNode[]): DataFlowPath[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const grouped = new Map<string, GovGraphEdge[]>();
  for (const edge of edges) {
    const existing = grouped.get(edge.pathId) ?? [];
    existing.push(edge);
    grouped.set(edge.pathId, existing);
  }

  return [...grouped.entries()].map(([pathKey, groupedEdges]) => {
    const first = groupedEdges[0];
    const last = groupedEdges.at(-1) ?? first;
    return {
      pathId: pathKey,
      fieldName: first.fieldName,
      fieldClass: first.fieldClass || classifyFieldName(first.fieldName),
      sourceNodeId: first.sourceNodeId,
      sinkNodeId: last.targetNodeId,
      edgeIds: groupedEdges.map((edge) => edge.id),
      documented: isDocumentedFlow(first.fieldName, groupedEdges, nodeById)
    };
  });
}

function isDocumentedFlow(
  fieldName: string,
  edges: GovGraphEdge[],
  nodeById: Map<string, GovGraphNode>
) {
  if (/email/i.test(fieldName)) {
    return edges.some((edge) => /compliant|covered|annotation/i.test(edge.evidence));
  }
  return edges.some((edge) => {
    const source = nodeById.get(edge.sourceNodeId);
    const target = nodeById.get(edge.targetNodeId);
    return /compliant|covered|annotation/i.test(`${edge.evidence} ${source?.metadata.label ?? ""} ${target?.metadata.label ?? ""}`);
  });
}
