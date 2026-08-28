import type { GovGraphAnalysis, GovGraphNode, Violation } from "./types";

/**
 * Builds a progressive-disclosure 3D graph model out of a GovGraphAnalysis:
 * a root node, one "hub" per module/directory grouping (collapsed by
 * default), and — once a hub is expanded — the real GovGraphNode entries
 * that belong to it plus the actual sensitive-data-flow edges between
 * visible nodes. Structural links (root->hub, hub->member) are separate
 * from "flow" links (real data-flow edges) so the UI can animate only the
 * latter during data tracing.
 */

export const ROOT_ID = "root";

export interface ModuleHub {
  id: string;
  label: string;
  memberIds: string[];
  maxScore: number;
}

export interface ExplorerNode {
  id: string;
  label: string;
  kind: "root" | "hub" | "leaf";
  val: number;
  color: string;
  filePath?: string;
  nodeType?: string;
  maxScore: number;
}

export interface ExplorerLink {
  id: string;
  source: string;
  target: string;
  kind: "structural" | "flow";
  color: string;
  score: number;
  fieldName?: string;
}

const RISK_COLORS = {
  critical: "#e84057",
  high: "#e8772e",
  medium: "#e8b83a",
  low: "#3abf7a",
  none: "#4b5563"
};

function riskColorForScore(score: number): string {
  if (score >= 80) return RISK_COLORS.critical;
  if (score >= 60) return RISK_COLORS.high;
  if (score > 0) return RISK_COLORS.medium;
  return RISK_COLORS.none;
}

/** Groups a node into a module bucket using metadata.module, falling back
 * to the file's directory path, then to its node type. */
function moduleKeyForNode(node: GovGraphNode): { key: string; label: string } {
  if (node.metadata.module) {
    return { key: `module:${node.metadata.module}`, label: node.metadata.module };
  }
  if (node.metadata.filePath) {
    const parts = node.metadata.filePath.split("/").filter(Boolean);
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join("/");
      return { key: `dir:${dir}`, label: dir };
    }
  }
  const label = node.type.replaceAll("_", " ");
  return { key: `type:${node.type}`, label: `Other (${label})` };
}

function scoreByPathMap(analysis: GovGraphAnalysis): Map<string, number> {
  return new Map(analysis.scoredFlows.map((flow) => [flow.pathId, flow.score]));
}

/** Max risk score among edges touching this node (0 if none). */
export function nodeMaxScore(analysis: GovGraphAnalysis, nodeId: string, scoreByPath?: Map<string, number>): number {
  const scores = scoreByPath ?? scoreByPathMap(analysis);
  let max = 0;
  for (const edge of analysis.edges) {
    if (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId) {
      const score = scores.get(edge.pathId) ?? 0;
      if (score > max) max = score;
    }
  }
  return max;
}

export function buildModuleHubs(analysis: GovGraphAnalysis): ModuleHub[] {
  const scoreByPath = scoreByPathMap(analysis);
  const hubs = new Map<string, ModuleHub>();

  for (const node of analysis.nodes) {
    const { key, label } = moduleKeyForNode(node);
    const existing = hubs.get(key);
    const score = nodeMaxScore(analysis, node.id, scoreByPath);
    if (existing) {
      existing.memberIds.push(node.id);
      existing.maxScore = Math.max(existing.maxScore, score);
    } else {
      hubs.set(key, { id: key, label, memberIds: [node.id], maxScore: score });
    }
  }

  return [...hubs.values()].sort((a, b) => b.maxScore - a.maxScore || b.memberIds.length - a.memberIds.length);
}

export function buildGraphData(
  analysis: GovGraphAnalysis,
  expandedHubIds: ReadonlySet<string>
): { nodes: ExplorerNode[]; links: ExplorerLink[] } {
  const hubs = buildModuleHubs(analysis);
  const nodeById = new Map(analysis.nodes.map((n) => [n.id, n]));
  const scoreByPath = scoreByPathMap(analysis);

  const nodes: ExplorerNode[] = [
    {
      id: ROOT_ID,
      label: analysis.repository.name,
      kind: "root",
      val: 14,
      color: "#f0ece4",
      maxScore: 0
    }
  ];
  const links: ExplorerLink[] = [];
  const visibleNodeIds = new Set<string>();

  for (const hub of hubs) {
    nodes.push({
      id: hub.id,
      label: hub.label,
      kind: "hub",
      val: Math.min(10, 4 + hub.memberIds.length * 0.4),
      color: riskColorForScore(hub.maxScore),
      maxScore: hub.maxScore
    });
    links.push({
      id: `struct:${ROOT_ID}->${hub.id}`,
      source: ROOT_ID,
      target: hub.id,
      kind: "structural",
      color: "#2a3040",
      score: 0
    });

    if (expandedHubIds.has(hub.id)) {
      for (const memberId of hub.memberIds) {
        const member = nodeById.get(memberId);
        if (!member) continue;
        visibleNodeIds.add(memberId);
        const score = nodeMaxScore(analysis, memberId, scoreByPath);
        nodes.push({
          id: member.id,
          label: member.name,
          kind: "leaf",
          val: 2,
          color: riskColorForScore(score),
          filePath: member.metadata.filePath,
          nodeType: member.type,
          maxScore: score
        });
        links.push({
          id: `struct:${hub.id}->${member.id}`,
          source: hub.id,
          target: member.id,
          kind: "structural",
          color: "#2a3040",
          score: 0
        });
      }
    }
  }

  // Real sensitive-data-flow edges, only when both endpoints are visible.
  for (const edge of analysis.edges) {
    if (!visibleNodeIds.has(edge.sourceNodeId) || !visibleNodeIds.has(edge.targetNodeId)) continue;
    const score = scoreByPath.get(edge.pathId) ?? 0;
    links.push({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      kind: "flow",
      color: riskColorForScore(score),
      score,
      fieldName: edge.fieldName
    });
  }

  return { nodes, links };
}

export function getFindingsForNode(analysis: GovGraphAnalysis, nodeId: string): Violation[] {
  const flowByPath = new Map(analysis.flows.map((flow) => [flow.pathId, flow]));
  const edgeById = new Map(analysis.edges.map((edge) => [edge.id, edge]));

  return analysis.findings.filter((finding) => {
    const flow = flowByPath.get(finding.pathId);
    if (!flow) return false;
    return flow.edgeIds.some((edgeId) => {
      const edge = edgeById.get(edgeId);
      return edge && (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId);
    });
  });
}
