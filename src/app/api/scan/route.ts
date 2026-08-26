import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLatestMockAnalysis, refreshMockAnalysis } from "@/lib/govgraph/analysis-service";
import { enqueueMockScanJob, getLatestScanJob } from "@/lib/govgraph/scan-jobs";

export async function GET() {
  const latestJob = getLatestScanJob();
  return NextResponse.json({
    ...(await getLatestMockAnalysis()),
    latestJob
  });
}

export async function POST(request: NextRequest) {
  if (request.nextUrl.searchParams.get("mode") === "async") {
    return NextResponse.json(
      {
        job: enqueueMockScanJob()
      },
      { status: 202 }
    );
  }

  return NextResponse.json(await refreshMockAnalysis(), { status: 201 });
}
