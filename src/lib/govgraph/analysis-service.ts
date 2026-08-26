import { mockLatentGraphFixture } from "@/data/mock-latentgraph";
import { createSingleFlight } from "@/lib/concurrency/batch";
import { normalizeLatentGraphFixture } from "./normalizer";
import { evaluatePolicies, starterRules } from "./policies";
import { productConfig } from "./product-config";
import { buildRemediationPreviews } from "./remediation";
import { scoreFlows } from "./risk-scoring";
import type { ComplianceSummary, GovGraphAnalysis, Severity } from "./types";

const analysisCacheTtlMs = 30_000;
const runCachedAnalysisOnce = createSingleFlight<GovGraphAnalysis>();

interface AnalysisCacheEntry {
  value: GovGraphAnalysis;
  expiresAt: number;
}

declare global {
  var __govGraphAnalysisCache: AnalysisCacheEntry | null | undefined;
}

function getCachedAnalysis() {
  return globalThis.__govGraphAnalysisCache ?? null;
}

function setCachedAnalysis(value: GovGraphAnalysis) {
  globalThis.__govGraphAnalysisCache = {
    value,
    expiresAt: Date.now() + analysisCacheTtlMs
  };
}

export function runMockAnalysis(): GovGraphAnalysis {
  const graph = normalizeLatentGraphFixture(mockLatentGraphFixture);
  const scoredFlows = scoreFlows(graph.flows, graph.edges, graph.nodes);
  const findings = evaluatePolicies(graph.flows, scoredFlows, graph.nodes, graph.edges, starterRules)
    .sort((a, b) => b.score - a.score);
  const remediations = buildRemediationPreviews(findings);

  return {
    repository: {
      id: productConfig.defaultRepository.id,
      name: productConfig.defaultRepository.name,
      branch: productConfig.defaultRepository.branch,
      commitSha: productConfig.defaultRepository.commitSha,
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
}

export async function getLatestMockAnalysis(): Promise<GovGraphAnalysis> {
  const now = Date.now();
  const cachedAnalysis = getCachedAnalysis();
  if (cachedAnalysis && cachedAnalysis.expiresAt > now) {
    return cachedAnalysis.value;
  }

  return runCachedAnalysisOnce("latest-mock-analysis", async () => {
    const next = runMockAnalysis();
    setCachedAnalysis(next);
    return next;
  });
}

export async function refreshMockAnalysis(): Promise<GovGraphAnalysis> {
  return runCachedAnalysisOnce("refresh-mock-analysis", async () => {
    const next = runMockAnalysis();
    setCachedAnalysis(next);
    return next;
  });
}

function buildSummary(findings: GovGraphAnalysis["findings"], regulatedFlows: number): ComplianceSummary {
  const countBySeverity = (severity: Severity) =>
    findings.filter((finding) => finding.severity === severity && finding.status === "open").length;
  const overallRisk =
    findings.length === 0
      ? 0
      : Math.round(findings.reduce((total, finding) => total + finding.score, 0) / findings.length);

  return {
    overallRisk,
    openFindings: findings.filter((finding) => finding.status === "open").length,
    criticalFindings: countBySeverity("critical"),
    highFindings: countBySeverity("high"),
    mediumFindings: countBySeverity("medium"),
    lowFindings: countBySeverity("low"),
    regulatedFlows
  };
}

export function getFindingById(id: string) {
  const analysis = getCachedAnalysis()?.value ?? runMockAnalysis();
  return analysis.findings.find((finding) => finding.id === id) ?? null;
}
