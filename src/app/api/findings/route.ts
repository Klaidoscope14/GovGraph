import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLatestMockAnalysis } from "@/lib/govgraph/analysis-service";
import { parseFindingQuery, queryFindings } from "@/lib/govgraph/finding-query";

export async function GET(request: NextRequest) {
  const analysis = await getLatestMockAnalysis();
  const page = queryFindings(analysis, parseFindingQuery(request.nextUrl.searchParams));

  return NextResponse.json({
    repository: analysis.repository,
    summary: analysis.summary,
    findings: page.findings,
    pagination: page.pagination,
    filters: page.filters
  });
}
