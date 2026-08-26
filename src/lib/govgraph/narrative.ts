import type { DataFlowPath, PolicyRule } from "./types";

export function generateNarrative(
  flow: DataFlowPath,
  rule: PolicyRule,
  path: string[],
  rationale: string
) {
  const source = path[0] ?? "an unknown source";
  const sink = path[path.length - 1] ?? "an unknown sink";
  const middle = path.slice(1, -1);
  const via = middle.length > 0 ? ` through ${middle.join(" -> ")}` : "";

  return `${flow.fieldName} classified as ${flow.fieldClass} is read in ${source}${via} and reaches ${sink}. This violates ${rule.regulation}: ${rule.description} ${rationale}`;
}
