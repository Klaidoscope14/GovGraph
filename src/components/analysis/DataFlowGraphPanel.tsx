"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { nodeColors, severityColors } from "./display";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

export function DataFlowGraphPanel({
  analysis,
  heightClassName = "h-[474px]"
}: {
  analysis: GovGraphAnalysis;
  heightClassName?: string;
}) {
  const graph = buildFlowGraph(analysis);

  return (
    <div className="min-h-[530px] rounded-lg border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-[#486474]" />
          <h2 className="text-sm font-semibold">Sensitive Data Flow Graph</h2>
        </div>
        <span className="rounded-md border border-line px-2 py-1 text-xs text-[#5f6d79]">
          {analysis.nodes.length} nodes / {analysis.edges.length} edges
        </span>
      </div>
      <div className={heightClassName}>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          fitView
          minZoom={0.35}
          maxZoom={1.5}
          nodesDraggable
        >
          <Background color="#d8dee5" gap={18} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

function buildFlowGraph(analysis: GovGraphAnalysis): { nodes: Node[]; edges: Edge[] } {
  const scoreByPath = new Map(analysis.scoredFlows.map((flow) => [flow.pathId, flow.score]));
  const columns = new Map<string, number>([
    ["api_endpoint", 0],
    ["function", 1],
    ["module", 1],
    ["db_table", 0],
    ["event_bus_topic", 2],
    ["log_sink", 3],
    ["external_sink", 3]
  ]);
  const typeCounts = new Map<string, number>();

  const nodes: Node[] = analysis.nodes.map((node) => {
    const column = columns.get(node.type) ?? 1;
    const count = typeCounts.get(node.type) ?? 0;
    typeCounts.set(node.type, count + 1);

    return {
      id: node.id,
      position: {
        x: column * 275 + 40,
        y: count * 92 + (node.type === "module" ? 35 : 0)
      },
      data: {
        label: (
          <div className="w-[178px]">
            <div className="truncate font-semibold">{node.name}</div>
            <div className="mt-1 truncate text-[11px] text-[#697784]">{node.type.replaceAll("_", " ")}</div>
          </div>
        )
      },
      style: {
        background: nodeColors[node.type] ?? "#ffffff",
        color: "#17212b",
        borderColor: node.type === "log_sink" || node.type === "external_sink" ? "#d85b41" : "#cfd7df",
        width: 200,
        minHeight: 58
      }
    };
  });

  const edges: Edge[] = analysis.edges.map((edge) => {
    const score = scoreByPath.get(edge.pathId) ?? 0;
    const color =
      score >= 80
        ? severityColors.critical
        : score >= 70
          ? severityColors.high
          : score >= 50
            ? severityColors.medium
            : severityColors.low;

    return {
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: `${edge.fieldName} ${score}`,
      animated: score >= 75,
      markerEnd: { type: MarkerType.ArrowClosed, color },
      style: {
        stroke: color,
        strokeWidth: score >= 75 ? 2.6 : 1.6
      },
      labelStyle: {
        fill: "#17212b",
        fontSize: 11,
        fontWeight: 600
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.88
      }
    };
  });

  return { nodes, edges };
}

