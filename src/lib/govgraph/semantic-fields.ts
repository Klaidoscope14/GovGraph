import type { LatentGraphClient } from "@/lib/latentgraph/client";
import type { FieldClass } from "./types";

/**
 * Discovers codebase-specific sensitive fields (PII/FINANCIAL/SECRET) using
 * LatentGraph's `ask_codebase` MCP tool instead of a fixed regex list. This
 * generalizes field detection across domains (e.g. a trading engine's
 * `order_id`/`account_balance` vs a healthcare app's `patient_id`) without
 * requiring a separate LLM API key — `ask_codebase` already runs server-side
 * on the LatentGraph backend using the project's own credentials.
 *
 * Returns a lowercase-keyed map so callers can do case-insensitive lookups
 * against tokens extracted from dependency/file text.
 */
export async function discoverSemanticFields(
  client: LatentGraphClient
): Promise<Map<string, FieldClass>> {
  const hints = new Map<string, FieldClass>();

  const prompt =
    "List every field, variable, column, or parameter name in this codebase that holds " +
    "personally identifiable information (PII), financial data, or secrets/credentials " +
    "(API keys, passwords, tokens, private keys). Respond with ONE field per line, in " +
    "exactly this format with no extra commentary: `field_name: CATEGORY` where CATEGORY " +
    "is one of PII, FINANCIAL, or SECRET.";

  let answer = "";
  try {
    const response = await client.askCodebase(prompt, 15);
    if (response.degraded || !response.answer) {
      console.warn("[GovGraph] Semantic field discovery: no answer (degraded or empty)");
      return hints;
    }
    answer = response.answer;
  } catch (err) {
    console.warn("[GovGraph] Semantic field discovery failed:", err instanceof Error ? err.message : err);
    return hints;
  }

  for (const [name, fieldClass] of parseFieldClassLines(answer)) {
    hints.set(name.toLowerCase(), fieldClass);
  }

  console.log(`[GovGraph] Discovered ${hints.size} semantic field hints via ask_codebase`);
  return hints;
}

const CATEGORY_PATTERN = /\b(PII|FINANCIAL|SECRET)\b/i;

// Matches: `field_name: PII`, "- field_name — FINANCIAL", "* `api_key`: SECRET", etc.
// Strips markdown bullets/backticks/bold and accepts `:`, `-`, `–`, or `is` as the separator.
const FIELD_LINE_PATTERN =
  /^[\s\-*•]*(?:\d+[.)]\s*)?`?\*{0,2}([A-Za-z][A-Za-z0-9_]{1,60})\*{0,2}`?\s*(?:[:\-–—]|is)\s*\*{0,2}\(?([A-Za-z]+)\)?\*{0,2}/;

function parseFieldClassLines(text: string): Array<[string, FieldClass]> {
  const results: Array<[string, FieldClass]> = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(FIELD_LINE_PATTERN);
    if (!match) continue;

    const [, rawName, rawCategory] = match;
    const categoryMatch = rawCategory.match(CATEGORY_PATTERN);
    if (!categoryMatch) continue;

    const fieldClass = categoryMatch[1].toUpperCase() as FieldClass;
    if (fieldClass !== "PII" && fieldClass !== "FINANCIAL" && fieldClass !== "SECRET") continue;

    results.push([rawName, fieldClass]);
  }

  // Fallback: some responses bury field/category pairs inline in prose rather
  // than one-per-line. Scan for `field_name` (category) or `field_name`: category
  // patterns anywhere in the text as a second pass.
  if (results.length === 0) {
    const inlinePattern = /`([A-Za-z][A-Za-z0-9_]{1,60})`\s*[:\-–—(]\s*\(?(PII|FINANCIAL|SECRET)\)?/gi;
    let match: RegExpExecArray | null;
    while ((match = inlinePattern.exec(text)) !== null) {
      results.push([match[1], match[2].toUpperCase() as FieldClass]);
    }
  }

  return results;
}
