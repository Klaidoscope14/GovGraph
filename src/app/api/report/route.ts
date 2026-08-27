import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";
import { parseFindingQuery, queryFindings } from "@/lib/govgraph/finding-query";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const analysis = await getLatestAnalysis();
  const page = queryFindings(analysis, parseFindingQuery(request.nextUrl.searchParams));

  const format = request.nextUrl.searchParams.get("format");

  if (format === "json") {
    return NextResponse.json({
      repository: analysis.repository,
      summary: analysis.summary,
      findings: page.findings,
      exportedAt: new Date().toISOString()
    }, {
      headers: {
        "Content-Disposition": "attachment; filename=govgraph-findings.json"
      }
    });
  }

  const rows = [
    ["Finding ID", "Severity", "Score", "Regulation", "Field", "Path", "Narrative"],
    ...page.findings.map((finding) => [
      finding.id,
      finding.severity,
      finding.score,
      finding.regulation,
      finding.evidence.fieldName,
      finding.evidence.path.join(" -> "),
      finding.narrative
    ])
  ];

  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=govgraph-findings.csv"
    }
  });
}
