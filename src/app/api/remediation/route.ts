import { NextResponse } from "next/server";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";

export async function GET() {
  const analysis = await getLatestAnalysis();
  return NextResponse.json({
    repository: analysis.repository,
    remediations: analysis.remediations
  });
}
