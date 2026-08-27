"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { nodeColors, severityColors } from "./display";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

const LANE_CONFIG = {
  api_endpoint: { column: 0, label: "Entry Points", icon: "⚡", headerColor: "#2563eb" },
  function:     { column: 1, label: "Processing",   icon: "ƒ",  headerColor: "#8b5cf6" },
  module:       { column: 1, label: "Processing",   icon: "📦", headerColor: "#8b5cf6" },
  db_table:     { column: 2, label: "Storage",      icon: "🗄", headerColor: "#059669" },
  event_bus_topic: { column: 3, label: "Events",    icon: "📡", headerColor: "#d97706" },
  log_sink:     { column: 4, label: "Sinks",        icon: "📝", headerColor: "#e84057" },
  external_sink: { column: 4, label: "Sinks",       icon: "🌐", headerColor: "#e84057" },
};

const LANE_X_POSITIONS = [60, 320, 580, 840, 1100];
const LANE_WIDTH = 220;
const NODE_GAP_Y = 100;
const LANE_HEADER_Y = 10;
const NODE_START_Y = 70;

export function DataFlowGraphPanel({
  analysis,
  heightClassName = "h-[520px]"
}: {
  analysis: GovGraphAnalysis;
  heightClassName?: string;
}) {
  const graph = buildFlowGraph(analysis);

  return (
    <div className="glass-card min-h-[530px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold">Sensitive Data Flow Graph</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-risk-critical" />
            <span className="text-[10px] text-text-secondary">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-risk-high" />
            <span className="text-[10px] text-text-secondary">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-risk-low" />
            <span className="text-[10px] text-text-secondary">Low</span>
          </div>
          <span className="ml-2 rounded-md border border-line bg-elevated px-2 py-1 text-xs text-text-secondary">
            {analysis.nodes.length} nodes / {analysis.edges.length} edges
          </span>
        </div>
      </div>
      <div className={heightClassName}>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.25}
          maxZoom={2}
          nodesDraggable
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#2a3040" gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

function buildFlowGraph(analysis: GovGraphAnalysis): { nodes: Node[]; edges: Edge[] } {
  const scoreByPath = new Map(analysis.scoredFlows.map((flow) => [flow.pathId, flow.score]));

  const columnCounts = new Map<number, number>();
  const laneHeadersAdded = new Set<number>();
  const nodes: Node[] = [];

  for (const node of analysis.nodes) {
    const config = LANE_CONFIG[node.type as keyof typeof LANE_CONFIG] ?? LANE_CONFIG.function;
    const column = config.column;
    const count = columnCounts.get(column) ?? 0;
    columnCounts.set(column, count + 1);

    const x = LANE_X_POSITIONS[column] ?? column * 260 + 60;
    const y = NODE_START_Y + count * NODE_GAP_Y;

    if (!laneHeadersAdded.has(column)) {
      laneHeadersAdded.add(column);
      nodes.push({
        id: `lane-header-${column}`,
        type: "default",
        position: { x: x - 10, y: LANE_HEADER_Y },
        selectable: false,
        draggable: false,
        data: {
          label: (
            <div className="flex items-center gap-1.5 px-1">
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: config.headerColor }}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: config.headerColor }}>
                {config.label}
              </span>
            </div>
          )
        },
        style: {
          background: "transparent",
          border: "none",
          boxShadow: "none",
          width: LANE_WIDTH,
          pointerEvents: "none" as const,
        }
      });
    }

    nodes.push({
      id: node.id,
      position: { x, y },
      data: {
        label: (
          <div className="w-[185px] px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{config.icon}</span>
              <span className="truncate text-xs font-semibold">{node.name}</span>
            </div>
            <div className="mt-1 truncate text-[10px] text-text-secondary">
              {node.type.replaceAll("_", " ")}
            </div>
            {node.metadata.filePath && (
              <div className="mt-0.5 truncate text-[9px] font-mono text-text-secondary/50">
                {node.metadata.filePath}
              </div>
            )}
          </div>
        )
      },
      style: {
        background: nodeColors[node.type] ?? "#1c2230",
        color: "#f0ece4",
        border: `1px solid ${node.type === "log_sink" || node.type === "external_sink" ? "#e8772e44" : "#2a3040"}`,
        borderRadius: 10,
        width: 210,
        minHeight: 54,
        boxShadow: node.type === "external_sink" || node.type === "log_sink"
          ? "0 0 16px rgba(232, 119, 46, 0.12)"
          : "0 4px 16px rgba(0, 0, 0, 0.25)"
      }
    });
  }

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
      label: `${edge.fieldName} ${score > 0 ? `(${score})` : ""}`,
      animated: score >= 75,
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
      style: {
        stroke: color,
        strokeWidth: score >= 75 ? 2.5 : 1.5,
        filter: score >= 75 ? `drop-shadow(0 0 6px ${color}50)` : undefined,
        opacity: score < 30 ? 0.5 : 1,
      },
      labelStyle: {
        fill: "#f0ece4",
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "var(--font-jetbrains-mono), monospace"
      },
      labelBgStyle: {
        fill: "#141820",
        fillOpacity: 0.94,
        rx: 4,
        ry: 4,
      }
    };
  });

  return { nodes, edges };
}
