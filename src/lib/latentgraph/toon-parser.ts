/**
 * Parser for TOON-fenced responses from LatentGraph MCP tools.
 *
 * LatentGraph wraps tool responses in ```toon ... ``` fences containing
 * TOON-encoded data. The server uses @toon-format/toon v2.3.0 which may
 * encode multi-line strings differently from v4.x. We handle version
 * mismatches by pre-processing the raw text before decoding.
 */

export class ToonParseError extends Error {
  constructor(public readonly rawText: string, cause?: unknown) {
    super(`Failed to parse LatentGraph response: ${rawText.slice(0, 120)}`);
    this.name = "ToonParseError";
    this.cause = cause;
  }
}

export async function parseToonResponse<T = unknown>(text: string): Promise<T> {
  const stripped = stripToonFence(text);

  if (/^degraded\s*[:=]\s*true/i.test(stripped)) {
    throw new ToonParseError(
      stripped,
      new Error("Project is in degraded state. Run `lgraph init` or `lgraph update` to re-index.")
    );
  }

  if (/^error\s*[:=]/i.test(stripped) || /^not[_ ]found/i.test(stripped)) {
    throw new ToonParseError(stripped, new Error(stripped));
  }

  // Try JSON first (some responses might be plain JSON)
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Not JSON — try TOON decode
  }

  // Pre-process: join continuation lines for quoted strings that span
  // multiple lines (TOON v2 may split them, v4 decoder expects one line)
  const preprocessed = joinMultiLineQuotedStrings(stripped);

  try {
    const { decode } = await import("@toon-format/toon");
    const result = decode(preprocessed, { strict: false });
    return result as T;
  } catch {
    // v4 decoder failed — fall back to manual parse
  }

  // Last resort: manual TOON-to-JSON conversion
  try {
    return manualToonParse<T>(stripped);
  } catch (cause) {
    throw new ToonParseError(stripped, cause);
  }
}

function stripToonFence(text: string): string {
  const fenceStart = text.indexOf("```toon");
  if (fenceStart === -1) {
    return text.trim();
  }

  const contentStart = text.indexOf("\n", fenceStart);
  if (contentStart === -1) return text.trim();

  const fenceEnd = text.indexOf("```", contentStart);
  const content = fenceEnd === -1
    ? text.slice(contentStart)
    : text.slice(contentStart, fenceEnd);

  return content.trim();
}

/**
 * Join lines where a quoted string spans multiple lines.
 * A line starting with `key: "...` that doesn't end with `"` continues
 * until a line ending with `"` is found, OR until we hit another top-level
 * TOON key (like a tabular array header or a new `key:` line).
 */
function joinMultiLineQuotedStrings(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Check if this line opens a quoted value that doesn't close
    const match = line.match(/^(\S[^:]*:\s*)"(.*)$/);
    if (match && !line.endsWith('"')) {
      // Collect continuation lines until closing quote or a new top-level key
      const parts = [match[2]];
      i++;
      while (i < lines.length) {
        const cont = lines[i];
        // Stop if we hit a new top-level TOON key (not indented continuation)
        // Tabular array header: key[N]{cols}:
        if (/^\w[\w_]*\[\d+/.test(cont)) {
          break;
        }
        // New top-level key: word: value (but not indented lines)
        if (/^\w[\w_]*\s*:/.test(cont) && !cont.startsWith(" ") && !cont.startsWith("\t")) {
          break;
        }
        if (cont.endsWith('"')) {
          parts.push(cont.slice(0, -1));
          i++;
          break;
        }
        parts.push(cont);
        i++;
      }
      // Join with escaped newlines and re-quote
      const joined = parts.join("\\n").replace(/"/g, '\\"');
      result.push(`${match[1]}"${joined}"`);
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}

/**
 * Manual TOON parser for when the @toon-format/toon decoder fails.
 * Handles the subset of TOON used by LatentGraph MCP responses.
 */
function manualToonParse<T>(text: string): T {
  const obj: Record<string, unknown> = {};
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line || line.startsWith("#")) {
      i++;
      continue;
    }

    // Key-value line: `key: value` or `key: "quoted value"`
    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const [, key, rawValue] = kvMatch;
      let value: unknown = rawValue;

      // Quoted string
      if (rawValue.startsWith('"')) {
        if (rawValue.endsWith('"') && rawValue.length > 1) {
          value = rawValue.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
        } else {
          // Multi-line quoted string
          const parts = [rawValue.slice(1)];
          i++;
          while (i < lines.length) {
            if (lines[i].endsWith('"')) {
              parts.push(lines[i].slice(0, -1));
              break;
            }
            parts.push(lines[i]);
            i++;
          }
          value = parts.join("\n").replace(/\\"/g, '"');
        }
      }
      // Empty array
      else if (rawValue === "[]") {
        value = [];
      }
      // Number
      else if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
        value = Number(rawValue);
      }
      // Boolean
      else if (rawValue === "true") value = true;
      else if (rawValue === "false") value = false;
      else if (rawValue === "null") value = null;

      obj[key] = value;
      i++;
      continue;
    }

    // Tabular array header: `key[N]{col1\tcol2\t...}:` or `key[N]{col1,col2,...}:`
    const tableMatch = line.match(/^(\w[\w_]*)\[(\d+)[^\]]*\]\{([^}]+)\}\s*:\s*$/);
    if (tableMatch) {
      const [, key, countStr, colsStr] = tableMatch;
      // Columns can be tab-separated or comma-separated
      const cols = colsStr.includes("\t")
        ? colsStr.split("\t").map((c) => c.trim())
        : colsStr.split(",").map((c) => c.trim());
      const count = parseInt(countStr, 10);
      const rows: Record<string, unknown>[] = [];

      // Read data rows (indented with spaces or tabs)
      let r = 0;
      let j = i + 1;
      while (r < count && j < lines.length) {
        const rowLine = lines[j];
        // Skip empty lines within the table
        if (!rowLine.trim()) { j++; continue; }
        // Stop if we hit a non-indented line (next top-level key)
        if (rowLine[0] !== " " && rowLine[0] !== "\t" && !rowLine.startsWith("  ")) break;
        const cells = rowLine.replace(/^\s+/, "").split("\t");
        const row: Record<string, unknown> = {};
        for (let c = 0; c < cols.length; c++) {
          const cell = cells[c] ?? "";
          if (/^-?\d+$/.test(cell)) row[cols[c]] = parseInt(cell, 10);
          else if (/^-?\d+\.\d+$/.test(cell)) row[cols[c]] = parseFloat(cell);
          else if (cell === "true") row[cols[c]] = true;
          else if (cell === "false") row[cols[c]] = false;
          else if (cell === "" || cell === "null") row[cols[c]] = undefined;
          else row[cols[c]] = cell;
        }
        rows.push(row);
        r++;
        j++;
      }

      obj[key] = rows;
      i = j;
      continue;
    }

    i++;
  }

  return obj as T;
}
