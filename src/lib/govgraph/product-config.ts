export const productConfig = {
  name: "GovGraph",
  tagline: "Continuous source-code-level compliance for sensitive data flows.",
  defaultRepository: {
    id: "repo_legacy_claims",
    name: "LegacyClaims",
    branch: "main",
    commitSha: "9f34c2a"
  }
} as const;

export function getDataSourceConfig() {
  const mode = process.env.GOVGRAPH_DATA_SOURCE ?? "mock";

  return {
    mode,
    label: mode === "latentgraph" ? "LatentGraph MCP" : "Mock fixture"
  };
}
