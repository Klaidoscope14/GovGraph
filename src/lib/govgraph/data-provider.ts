import {
  getLatestMockAnalysis,
  refreshMockAnalysis,
  runMockAnalysis
} from "./analysis-service";
import type { GovGraphAnalysis, LatentGraphFixture } from "./types";
import { normalizeLatentGraphFixture } from "./normalizer";
import { scoreFlows } from "./risk-scoring";
import { evaluatePolicies, starterRules } from "./policies";
import { buildRemediationPreviews } from "./remediation";
import { discoverSemanticFields } from "./semantic-fields";
import type { ComplianceSummary, Severity } from "./types";

type RawOverview = Record<string, unknown>;

interface NormalizedOverview {
  architecture_summary: string;
  top_level_modules: Array<{ path: string; summary?: string; file_count?: number }>;
}

interface ScanCredentials {
  projectId: string;
  apiKey: string;
  branch: string;
}

function normalizeOverview(raw: unknown): NormalizedOverview {
  const obj = (raw && typeof raw === "object" ? raw : {}) as RawOverview;

  const architectureSummary =
    typeof obj.architecture_summary === "string"
      ? obj.architecture_summary
      : typeof obj.overview === "string"
        ? obj.overview
        : "";

  let modules: Array<{ path: string; summary?: string; file_count?: number }> = [];

  const rawModules = obj.top_level_modules;
  if (Array.isArray(rawModules)) {
    modules = rawModules
      .filter((m): m is Record<string, unknown> => m != null && typeof m === "object")
      .map((m) => ({
        path: String(m.path ?? m.name ?? ""),
        summary: typeof m.summary === "string" ? m.summary : undefined,
        file_count: typeof m.file_count === "number" ? m.file_count : undefined,
      }))
      .filter((m) => m.path !== "");
  } else if (rawModules && typeof rawModules === "object" && !Array.isArray(rawModules)) {
    const m = rawModules as Record<string, unknown>;
    if (m.path || m.name) {
      modules = [{
        path: String(m.path ?? m.name ?? ""),
        summary: typeof m.summary === "string" ? m.summary : undefined,
        file_count: typeof m.file_count === "number" ? m.file_count : undefined,
      }];
    }
  }

  if (modules.length === 0) {
    console.warn("[GovGraph] No top_level_modules found in overview. Raw keys:", Object.keys(obj));
    modules = [{ path: "root", summary: architectureSummary.slice(0, 100) }];
  }

  return { architecture_summary: architectureSummary, top_level_modules: modules };
}

// --- Persistent state (survives across requests in the same server process) ---

declare global {
  var __govgraphLastAnalysis: GovGraphAnalysis | null | undefined;
  var __govgraphLastCredentials: ScanCredentials | null | undefined;
}

function getLastAnalysis(): GovGraphAnalysis | null {
  return globalThis.__govgraphLastAnalysis ?? null;
}

function setLastAnalysis(analysis: GovGraphAnalysis, credentials?: ScanCredentials) {
  globalThis.__govgraphLastAnalysis = analysis;
  if (credentials) {
    globalThis.__govgraphLastCredentials = credentials;
  }
}

export function getLastCredentials(): ScanCredentials | null {
  return globalThis.__govgraphLastCredentials ?? null;
}

// --- Core analysis runner ---

async function runLatentGraphAnalysis(options: {
  projectId: string;
  apiKey: string;
  branch?: string;
}): Promise<GovGraphAnalysis> {
  const { LatentGraphMcpClient } = await import("@/lib/latentgraph/client");

  const client = new LatentGraphMcpClient({
    projectId: options.projectId,
    apiKey: options.apiKey,
    branch: options.branch ?? "main"
  });

  let rawOverview: unknown;
  try {
    rawOverview = await client.getProjectOverview();
  } catch (err) {
    console.error("[GovGraph] getProjectOverview failed:", err instanceof Error ? err.message : err);
    throw err;
  }

  console.log("[GovGraph] Raw overview:", JSON.stringify(rawOverview, null, 2)?.slice(0, 1000));

  const overview = normalizeOverview(rawOverview);
  console.log("[GovGraph] Normalized modules:", overview.top_level_modules.length);

  let allFilePaths: string[] = overview.top_level_modules
    .map((m) => m.path)
    .filter((p) => p !== "root");

  if (allFilePaths.length === 0) {
    console.log("[GovGraph] No real module paths — discovering files via ask_codebase");
    try {
      const answer = await client.askCodebase(
        "List the most important source files in this project, including entry points, core logic, and API handlers.",
        15
      );
      const citations = answer.citations ?? [];
      const fallbacks = answer.fallback_targets ?? [];
      allFilePaths = [...new Set([...citations, ...fallbacks])].filter(Boolean);
      console.log(`[GovGraph] Discovered ${allFilePaths.length} file paths from ask_codebase`);
    } catch (err) {
      console.warn("[GovGraph] ask_codebase failed:", err instanceof Error ? err.message : err);
    }
  }

  if (allFilePaths.length === 0) {
    throw new Error("No source files discovered for this project. The project may not be fully indexed.");
  }

  const [filesResults, depsResults, semanticHints] = await Promise.all([
    Promise.allSettled(allFilePaths.map((fp) => client.getFile(fp))),
    Promise.allSettled(allFilePaths.map((fp) => client.getDependencies(fp))),
    discoverSemanticFields(client)
  ]);

  const files = filesResults
    .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never> => r.status === "fulfilled")
    .map((r) => r.value);
  console.log(`[GovGraph] Got ${files.length}/${allFilePaths.length} files`);

  const dependencies = depsResults
    .filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never> => r.status === "fulfilled")
    .map((r) => r.value);
  console.log(`[GovGraph] Got ${dependencies.length}/${allFilePaths.length} dependency sets`);

  const moduleEntries = overview.top_level_modules[0]?.path === "root"
    ? allFilePaths.map((fp) => ({ path: fp, summary: "", file_count: 0 }))
    : overview.top_level_modules.map((m) => ({
        path: m.path,
        summary: m.summary ?? "",
        file_count: m.file_count ?? 0,
      }));

  const fixture: LatentGraphFixture = {
    overview: {
      architecture_summary: overview.architecture_summary,
      top_level_modules: moduleEntries,
    },
    files,
    dependencies,
  };

  const graph = normalizeLatentGraphFixture(fixture, semanticHints);
  const scoredFlows = scoreFlows(graph.flows, graph.edges, graph.nodes);
  const findings = evaluatePolicies(graph.flows, scoredFlows, graph.nodes, graph.edges, starterRules)
    .sort((a, b) => b.score - a.score);
  const remediations = buildRemediationPreviews(findings);

  const titleMatch = overview.architecture_summary.match(/\*\*([^*]+)\*\*/);
  const repoName = titleMatch?.[1]
    ?? (allFilePaths.length > 0 ? allFilePaths[0].split("/")[0] : "Repository");

  const branch = options.branch ?? "main";
  const analysis: GovGraphAnalysis = {
    repository: {
      id: options.projectId,
      name: repoName,
      branch,
      commitSha: `scan-${Date.now().toString(36)}`,
      scannedAt: new Date().toISOString()
    },
    nodes: graph.nodes,
    edges: graph.edges,
    flows: graph.flows,
    scoredFlows,
    rules: starterRules,
    findings,
    remediations,
    summary: buildSummary(findings, scoredFlows.length)
  };

  setLastAnalysis(analysis, { projectId: options.projectId, apiKey: options.apiKey, branch });
  return analysis;
}

// --- Public API ---

export async function scanWithCredentials(options: {
  projectId: string;
  apiKey: string;
  branch?: string;
}): Promise<GovGraphAnalysis> {
  return runLatentGraphAnalysis(options);
}

export async function getLatestAnalysis(): Promise<GovGraphAnalysis> {
  const cached = getLastAnalysis();
  if (cached) return cached;

  // Try MCP with stored or env credentials
  const creds = getLastCredentials();
  const projectId = creds?.projectId ?? process.env.LGRAPH_PROJECT_ID ?? "";
  const apiKey = creds?.apiKey ?? process.env.LGRAPH_API_KEY ?? "";
  const branch = creds?.branch ?? process.env.LGRAPH_BRANCH ?? "main";

  if (projectId && apiKey) {
    try {
      return await runLatentGraphAnalysis({ projectId, apiKey, branch });
    } catch (err) {
      console.warn("[GovGraph] MCP scan failed, falling back to mock:", err instanceof Error ? err.message : err);
    }
  }

  return getLatestMockAnalysis();
}

export async function refreshAnalysis(): Promise<GovGraphAnalysis> {
  // Clear cached analysis to force re-scan
  globalThis.__govgraphLastAnalysis = null;

  const creds = getLastCredentials();
  const projectId = creds?.projectId ?? process.env.LGRAPH_PROJECT_ID ?? "";
  const apiKey = creds?.apiKey ?? process.env.LGRAPH_API_KEY ?? "";
  const branch = creds?.branch ?? process.env.LGRAPH_BRANCH ?? "main";

  if (projectId && apiKey) {
    try {
      return await runLatentGraphAnalysis({ projectId, apiKey, branch });
    } catch (err) {
      console.warn("[GovGraph] MCP re-scan failed, falling back to mock:", err instanceof Error ? err.message : err);
    }
  }

  return refreshMockAnalysis();
}

function buildSummary(findings: GovGraphAnalysis["findings"], regulatedFlows: number): ComplianceSummary {
  const countBySeverity = (severity: Severity) =>
    findings.filter((f) => f.severity === severity && f.status === "open").length;
  const overallRisk =
    findings.length === 0
      ? 0
      : Math.round(findings.reduce((total, f) => total + f.score, 0) / findings.length);

  return {
    overallRisk,
    openFindings: findings.filter((f) => f.status === "open").length,
    criticalFindings: countBySeverity("critical"),
    highFindings: countBySeverity("high"),
    mediumFindings: countBySeverity("medium"),
    lowFindings: countBySeverity("low"),
    regulatedFlows
  };
}

export function runFixtureAnalysisForTests() {
  return runMockAnalysis();
}
