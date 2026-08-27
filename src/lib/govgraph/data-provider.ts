import {
  getLatestMockAnalysis,
  refreshMockAnalysis,
  runMockAnalysis
} from "./analysis-service";
import { getDataSourceConfig } from "./product-config";
import type { GovGraphAnalysis, LatentGraphFixture } from "./types";
import { normalizeLatentGraphFixture } from "./normalizer";
import { scoreFlows } from "./risk-scoring";
import { evaluatePolicies, starterRules } from "./policies";
import { buildRemediationPreviews } from "./remediation";
import type { ComplianceSummary, Severity } from "./types";

type RawOverview = Record<string, unknown>;

interface NormalizedOverview {
  architecture_summary: string;
  top_level_modules: Array<{ path: string; summary?: string; file_count?: number }>;
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
    // Single module object instead of array
    const m = rawModules as Record<string, unknown>;
    if (m.path || m.name) {
      modules = [{
        path: String(m.path ?? m.name ?? ""),
        summary: typeof m.summary === "string" ? m.summary : undefined,
        file_count: typeof m.file_count === "number" ? m.file_count : undefined,
      }];
    }
  }

  // If still empty, try to extract any useful structure
  if (modules.length === 0) {
    console.warn("[GovGraph] No top_level_modules found in overview. Raw keys:", Object.keys(obj));
    modules = [{ path: "root", summary: architectureSummary.slice(0, 100) }];
  }

  return { architecture_summary: architectureSummary, top_level_modules: modules };
}

export interface AnalysisDataProvider {
  mode: string;
  label: string;
  getLatestAnalysis(): Promise<GovGraphAnalysis>;
  refreshAnalysis(): Promise<GovGraphAnalysis>;
}

const mockProvider: AnalysisDataProvider = {
  mode: "mock",
  label: "Mock fixture",
  getLatestAnalysis: getLatestMockAnalysis,
  refreshAnalysis: refreshMockAnalysis
};

let lastAnalysis: GovGraphAnalysis | null = null;

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

  // When top_level_modules is missing/empty, discover file paths via ask_codebase
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
    console.warn("[GovGraph] No file paths discovered, using mock data");
    const { getLatestMockAnalysis } = await import("./analysis-service");
    return getLatestMockAnalysis();
  }

  const files = (await Promise.allSettled(
    allFilePaths.map((fp) => client.getFile(fp))
  )).filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never> => r.status === "fulfilled")
    .map((r) => r.value);
  console.log(`[GovGraph] Got ${files.length}/${allFilePaths.length} files`);

  const dependencies = (await Promise.allSettled(
    allFilePaths.map((fp) => client.getDependencies(fp))
  )).filter((r): r is PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never> => r.status === "fulfilled")
    .map((r) => r.value);
  console.log(`[GovGraph] Got ${dependencies.length}/${allFilePaths.length} dependency sets`);

  // Build module list from actual discovered files if top_level_modules was missing
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

  const graph = normalizeLatentGraphFixture(fixture);
  const scoredFlows = scoreFlows(graph.flows, graph.edges, graph.nodes);
  const findings = evaluatePolicies(graph.flows, scoredFlows, graph.nodes, graph.edges, starterRules)
    .sort((a, b) => b.score - a.score);
  const remediations = buildRemediationPreviews(findings);

  // Extract project name from overview text or first module path
  const titleMatch = overview.architecture_summary.match(/\*\*([^*]+)\*\*/);
  const repoName = titleMatch?.[1]
    ?? (allFilePaths.length > 0 ? allFilePaths[0].split("/")[0] : "Repository");

  const analysis: GovGraphAnalysis = {
    repository: {
      id: options.projectId,
      name: repoName,
      branch: options.branch ?? "main",
      commitSha: "live",
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

  lastAnalysis = analysis;
  return analysis;
}

function createLatentGraphProvider(): AnalysisDataProvider {
  return {
    mode: "latentgraph",
    label: "LatentGraph MCP",
    getLatestAnalysis: async () => {
      if (lastAnalysis) return lastAnalysis;
      return runLatentGraphAnalysis({
        projectId: process.env.LGRAPH_PROJECT_ID ?? "",
        apiKey: process.env.LGRAPH_API_KEY ?? "",
        branch: process.env.LGRAPH_BRANCH ?? "main"
      }).catch((error) => {
        console.warn("[GovGraph] LatentGraph MCP failed, falling back to mock:", error instanceof Error ? error.message : error);
        return getLatestMockAnalysis();
      });
    },
    refreshAnalysis: async () => {
      return runLatentGraphAnalysis({
        projectId: process.env.LGRAPH_PROJECT_ID ?? "",
        apiKey: process.env.LGRAPH_API_KEY ?? "",
        branch: process.env.LGRAPH_BRANCH ?? "main"
      }).catch((error) => {
        console.warn("[GovGraph] LatentGraph MCP failed, falling back to mock:", error instanceof Error ? error.message : error);
        return refreshMockAnalysis();
      });
    }
  };
}

export async function scanWithCredentials(options: {
  projectId: string;
  apiKey: string;
  branch?: string;
}): Promise<GovGraphAnalysis> {
  return runLatentGraphAnalysis(options);
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

const providers: Record<string, AnalysisDataProvider> = {
  mock: mockProvider
};

export function getAnalysisProvider(): AnalysisDataProvider {
  const mode = getDataSourceConfig().mode;
  if (mode === "latentgraph") {
    if (!providers.latentgraph) {
      providers.latentgraph = createLatentGraphProvider();
    }
    return providers.latentgraph;
  }
  return providers[mode] ?? mockProvider;
}

export async function getLatestAnalysis() {
  return getAnalysisProvider().getLatestAnalysis();
}

export async function refreshAnalysis() {
  return getAnalysisProvider().refreshAnalysis();
}

export function runFixtureAnalysisForTests() {
  return runMockAnalysis();
}
