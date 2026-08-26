import { NextResponse } from "next/server";
import { getLatestMockAnalysis } from "@/lib/govgraph/analysis-service";

export async function GET() {
  const analysis = await getLatestMockAnalysis();
  return NextResponse.json({
    repository: analysis.repository,
    remediations: analysis.remediations
  });
}
