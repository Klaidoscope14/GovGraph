"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods, ForceGraphProps } from "react-force-graph-3d";
import type { Object3D } from "three";
import {
  ChevronRight,
  Circle,
  Folder,
  GitBranch,
  Maximize2,
  Play,
  RotateCcw,
  Search,
  Square,
  X
} from "lucide-react";
import {
  ROOT_ID,
  buildGraphData,
  buildModuleHubs,
  getFindingsForNode,
  type ExplorerLink,
  type ExplorerNode,
  type ModuleHub
} from "@/lib/govgraph/graph-explorer";
import { severityColors } from "./display";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

// next/dynamic erases the library's generic type params, so cast the
// dynamically-loaded component back to its properly-typed shape (including
// the forwarded ref) for use with our ExplorerNode/ExplorerLink data.
type ForceGraph3DComponent = ComponentType<
  ForceGraphProps<ExplorerNode, ExplorerLink> & {
    ref?: MutableRefObject<ForceGraphMethods<ExplorerNode, ExplorerLink> | undefined>;
  }
>;

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false }) as ForceGraph3DComponent;

const RISK_LEGEND = [
  { label: "Critical", color: severityColors.critical },
  { label: "High", color: severityColors.high },
  { label: "Medium", color: severityColors.medium },
  { label: "Low / none", color: "#4b5563" }
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A node object as react-force-graph-3d mutates it in place once the physics
// simulation places it — x/y/z aren't in our own ExplorerNode type but the
// library attaches them to the same object reference we handed it.
type PositionedNode = ExplorerNode & { x?: number; y?: number; z?: number };

export function DataFlowExplorer({ analysis }: { analysis: GovGraphAnalysis }) {
  const [expandedHubIds, setExpandedHubIds] = useState<Set<string>>(new Set());
  const [tracing, setTracing] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ExplorerNode | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 520 });
  const [search, setSearch] = useState("");
  const fgRef = useRef<ForceGraphMethods<ExplorerNode, ExplorerLink> | undefined>(undefined);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const spriteTextRef = useRef<typeof import("three-spritetext").default | null>(null);

  // three-spritetext touches document/canvas at import time, so load it only
  // on the client, same as the force-graph library itself.
  useEffect(() => {
    import("three-spritetext").then((mod) => {
      spriteTextRef.current = mod.default;
    });
  }, []);

  // react-force-graph-3d needs explicit pixel width/height — it does not
  // respond to CSS percentage sizing on its container.
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const hubs = useMemo(() => buildModuleHubs(analysis), [analysis]);
  const graphData = useMemo(() => buildGraphData(analysis, expandedHubIds), [analysis, expandedHubIds]);
  const nodeById = useMemo(() => new Map(graphData.nodes.map((n) => [n.id, n as PositionedNode])), [graphData.nodes]);

  const toggleHub = useCallback((hubId: string) => {
    setExpandedHubIds((prev) => {
      const next = new Set(prev);
      if (next.has(hubId)) next.delete(hubId);
      else next.add(hubId);
      return next;
    });
  }, []);

  const frameCamera = useCallback((nodeCount: number, durationMs = 800) => {
    const distance = 200 + Math.sqrt(nodeCount) * 40;
    fgRef.current?.cameraPosition({ x: 0, y: 0, z: distance }, { x: 0, y: 0, z: 0 }, durationMs);
  }, []);

  /** Flies the camera toward a specific node's current simulated position. */
  const flyToNode = useCallback((node: PositionedNode) => {
    const { x = 0, y = 0, z = 0 } = node;
    const dist = Math.hypot(x, y, z);
    if (dist < 1) {
      frameCamera(graphData.nodes.length);
      return;
    }
    const distRatio = 1 + 80 / dist;
    fgRef.current?.cameraPosition(
      { x: x * distRatio, y: y * distRatio, z: z * distRatio },
      { x, y, z },
      900
    );
  }, [frameCamera, graphData.nodes.length]);

  const selectAndFocus = useCallback(
    (node: PositionedNode) => {
      setSelectedNode(node);
      flyToNode(node);
    },
    [flyToNode]
  );

  const handleNodeClick = useCallback(
    (node: ExplorerNode) => {
      const positioned = node as PositionedNode;
      if (node.kind === "root") {
        frameCamera(graphData.nodes.length);
        setSelectedNode(null);
        return;
      }
      if (node.kind === "hub") {
        toggleHub(node.id);
        selectAndFocus(positioned);
        return;
      }
      selectAndFocus(positioned);
    },
    [toggleHub, frameCamera, graphData.nodes.length, selectAndFocus]
  );

  /** Tree row click: toggles a hub's expansion (if applicable) and flies
   * the camera to it, mirroring clicking the sphere directly. */
  const handleTreeRowClick = useCallback(
    (hub: ModuleHub) => {
      toggleHub(hub.id);
      const node = nodeById.get(hub.id);
      if (node) selectAndFocus(node);
    },
    [toggleHub, nodeById, selectAndFocus]
  );

  const handleTreeLeafClick = useCallback(
    (nodeId: string) => {
      const node = nodeById.get(nodeId);
      if (node) selectAndFocus(node);
    },
    [nodeById, selectAndFocus]
  );

  async function startTracing() {
    if (tracing) {
      setTracing(false);
      return;
    }
    setIsRevealing(true);
    // Reveal hubs in bursts rather than strictly one-by-one so large repos
    // (dozens of hubs) don't take an eternity to finish expanding.
    const BURST_SIZE = 3;
    const remaining = hubs.filter((hub) => !expandedHubIds.has(hub.id));
    let revealedCount = graphData.nodes.length;
    for (let i = 0; i < remaining.length; i += BURST_SIZE) {
      const burst = remaining.slice(i, i + BURST_SIZE);
      revealedCount += burst.reduce((sum, hub) => sum + hub.memberIds.length, 0);
      setExpandedHubIds((prev) => {
        const next = new Set(prev);
        for (const hub of burst) next.add(hub.id);
        return next;
      });
      await sleep(120);
    }
    // zoomToFit measures the current node bounding box, which is unreliable
    // while the force simulation is still spreading nodes out. A distance
    // derived from node count gives a predictable frame regardless of
    // simulation state, so we don't need to wait for — or guess at — settle
    // time.
    frameCamera(revealedCount, 900);
    await sleep(900);
    setIsRevealing(false);
    setTracing(true);
  }

  function resetView() {
    setTracing(false);
    setIsRevealing(false);
    setExpandedHubIds(new Set());
    setSelectedNode(null);
    setTimeout(() => frameCamera(hubs.length + 1), 50);
  }

  const findings = selectedNode && selectedNode.kind === "leaf" ? getFindingsForNode(analysis, selectedNode.id) : [];

  const filteredHubs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return hubs;
    return hubs.filter((hub) => {
      if (hub.label.toLowerCase().includes(query)) return true;
      return hub.memberIds.some((id) => {
        const node = nodeById.get(id);
        return node?.label.toLowerCase().includes(query);
      });
    });
  }, [hubs, search, nodeById]);

  return (
    <div className="glass-card relative flex h-full flex-col overflow-hidden lg:flex-row">
      <ExplorerSidebar
        analysis={analysis}
        hubs={filteredHubs}
        expandedHubIds={expandedHubIds}
        selectedNode={selectedNode}
        nodeById={nodeById}
        search={search}
        onSearchChange={setSearch}
        onHubClick={handleTreeRowClick}
        onLeafClick={handleTreeLeafClick}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <GitBranch className="h-4 w-4 shrink-0 text-accent" />
            <h2 className="truncate text-sm font-semibold">
              {selectedNode ? selectedNode.label : "Sensitive Data Flow Graph"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {RISK_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-text-secondary">{item.label}</span>
              </div>
            ))}
            <span className="rounded-md border border-line bg-elevated px-2 py-1 text-xs text-text-secondary sm:ml-2">
              {analysis.nodes.length} nodes / {analysis.edges.length} edges
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-elevated/40 px-4 py-2.5">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-glow disabled:opacity-60"
            disabled={isRevealing}
            onClick={startTracing}
          >
            {tracing ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isRevealing ? "Revealing..." : tracing ? "Stop Tracing" : "Start Data Tracing"}
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
            onClick={resetView}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
            onClick={() => frameCamera(graphData.nodes.length)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fit view
          </button>
          <span className="hidden truncate text-[11px] text-text-secondary xl:ml-1 xl:inline">
            Click a module sphere (or the tree) to expand it · click a leaf node for details
          </span>
        </div>

        <div ref={canvasHostRef} className="relative min-h-[360px] w-full flex-1 sm:min-h-[520px]">
          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={canvasSize.width}
            height={canvasSize.height}
            backgroundColor="#0b0e14"
            nodeId="id"
            nodeLabel={(node: ExplorerNode) => `${node.label}${node.filePath ? ` — ${node.filePath}` : ""}`}
            nodeVal={(node: ExplorerNode) => node.val}
            nodeColor={(node: ExplorerNode) => node.color}
            nodeOpacity={0.95}
            nodeResolution={12}
            nodeThreeObjectExtend
            nodeThreeObject={(node: ExplorerNode) => {
              // Persistent floating labels for root/hub nodes only — leaf
              // nodes rely on hover tooltips (nodeLabel) so a fully
              // expanded graph of dozens of files doesn't turn into text
              // soup.
              const SpriteText = spriteTextRef.current;
              if (!SpriteText || node.kind === "leaf") return undefined as unknown as Object3D;
              const sprite = new SpriteText(node.label);
              sprite.color = node.kind === "root" ? "#f0ece4" : "#e8e4da";
              sprite.textHeight = node.kind === "root" ? 5 : 3.4;
              sprite.backgroundColor = "rgba(12,15,22,0.82)";
              sprite.padding = 2;
              sprite.borderRadius = 3;
              sprite.position.set(0, Math.cbrt(node.val) * 4 + 6, 0);
              return sprite;
            }}
            linkColor={(link: ExplorerLink) => link.color}
            linkWidth={(link: ExplorerLink) => (link.kind === "flow" ? (link.score >= 70 ? 2.5 : 1.4) : 0.6)}
            linkOpacity={0.55}
            linkDirectionalArrowLength={(link: ExplorerLink) => (link.kind === "flow" ? 3 : 0)}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={(link: ExplorerLink) =>
              tracing && link.kind === "flow" ? (link.score >= 80 ? 4 : link.score >= 60 ? 3 : link.score > 0 ? 2 : 1) : 0
            }
            linkDirectionalParticleWidth={(link: ExplorerLink) => (link.score >= 80 ? 2.4 : 1.6)}
            linkDirectionalParticleColor={(link: ExplorerLink) => link.color}
            linkDirectionalParticleSpeed={(link: ExplorerLink) => 0.004 + (link.score / 100) * 0.01}
            onNodeClick={handleNodeClick}
            showNavInfo={false}
            enableNodeDrag={false}
          />

          {selectedNode && (
            <div className="absolute right-3 top-3 w-[280px] max-w-[calc(100%-1.5rem)] animate-scale-in rounded-lg border border-line bg-surface/95 p-4 shadow-panel backdrop-blur-md sm:right-4 sm:top-4 sm:w-[300px]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-line bg-elevated px-1.5 py-0.5 text-[9px] font-semibold uppercase text-text-secondary">
                      {selectedNode.kind === "hub" ? "Module" : selectedNode.kind === "root" ? "Project" : selectedNode.nodeType?.replaceAll("_", " ")}
                    </span>
                    {selectedNode.maxScore > 0 && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
                        style={{ backgroundColor: selectedNode.color }}
                      >
                        risk {selectedNode.maxScore}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 truncate text-sm font-semibold">{selectedNode.label}</h3>
                </div>
                <button
                  className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-elevated hover:text-ink"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {selectedNode.filePath && (
                <div className="mt-2 truncate font-mono text-[10px] text-text-secondary/70">{selectedNode.filePath}</div>
              )}
              <div className="mt-3 space-y-2">
                {selectedNode.kind !== "leaf" ? (
                  <p className="text-xs text-text-secondary">
                    {selectedNode.kind === "hub" ? "Click again to collapse this module." : "Root of the scanned project."}
                  </p>
                ) : findings.length === 0 ? (
                  <p className="text-xs text-text-secondary">No policy findings touch this node.</p>
                ) : (
                  findings.map((finding) => (
                    <div key={finding.id} className="rounded-md border border-line bg-surface p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
                          style={{ backgroundColor: severityColors[finding.severity] }}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-[10px] text-text-secondary">{finding.regulation}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-5 text-text-secondary">{finding.narrative}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExplorerSidebar({
  analysis,
  hubs,
  expandedHubIds,
  selectedNode,
  nodeById,
  search,
  onSearchChange,
  onHubClick,
  onLeafClick
}: {
  analysis: GovGraphAnalysis;
  hubs: ModuleHub[];
  expandedHubIds: Set<string>;
  selectedNode: ExplorerNode | null;
  nodeById: Map<string, PositionedNode>;
  search: string;
  onSearchChange: (value: string) => void;
  onHubClick: (hub: ModuleHub) => void;
  onLeafClick: (nodeId: string) => void;
}) {
  return (
    <aside className="flex max-h-[40vh] w-full min-h-0 shrink-0 flex-col border-b border-line bg-surface/60 lg:max-h-none lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="border-b border-line px-3 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Explorer</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <SidebarStat label="Nodes" value={analysis.nodes.length} />
          <SidebarStat label="Edges" value={analysis.edges.length} />
          <SidebarStat label="Critical" value={analysis.summary.criticalFindings} color={severityColors.critical} />
          <SidebarStat label="High" value={analysis.summary.highFindings} color={severityColors.high} />
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            className="h-8 w-full rounded-md border border-line bg-elevated pl-7 pr-2 text-xs text-ink placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            placeholder="Filter modules..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center gap-1.5 px-1.5 py-1 text-xs font-medium text-text-secondary">
          <Circle className="h-2.5 w-2.5 fill-current" />
          root
          <span className="ml-auto text-[10px] text-text-secondary/60">{hubs.length}</span>
        </div>
        {hubs.map((hub) => {
          const isExpanded = expandedHubIds.has(hub.id);
          const isSelected = selectedNode?.id === hub.id;
          return (
            <div key={hub.id}>
              <button
                className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs transition-colors hover:bg-elevated ${
                  isSelected ? "bg-accent-subtle text-accent" : "text-ink"
                }`}
                onClick={() => onHubClick(hub)}
              >
                <ChevronRight className={`h-3 w-3 shrink-0 text-text-secondary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                <Folder className="h-3 w-3 shrink-0 text-text-secondary" />
                <span className="truncate">{hub.label}</span>
                <span className="ml-auto shrink-0 rounded bg-elevated px-1 text-[10px] text-text-secondary">
                  {hub.memberIds.length}
                </span>
              </button>
              {isExpanded && (
                <div className="ml-4 border-l border-line pl-2">
                  {hub.memberIds.map((memberId) => {
                    const member = nodeById.get(memberId);
                    if (!member) return null;
                    const memberSelected = selectedNode?.id === memberId;
                    return (
                      <button
                        key={memberId}
                        className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-elevated ${
                          memberSelected ? "bg-accent-subtle text-accent" : "text-text-secondary"
                        }`}
                        onClick={() => onLeafClick(memberId)}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        <span className="truncate">{member.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SidebarStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-md border border-line bg-elevated px-2 py-1.5">
      <div className="text-[9px] uppercase text-text-secondary">{label}</div>
      <div className="font-metric text-sm font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
