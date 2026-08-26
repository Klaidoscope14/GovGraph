import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLatestAnalysis, refreshAnalysis } from "@/lib/govgraph/data-provider";
import { enqueueMockScanJob, getLatestScanJob } from "@/lib/govgraph/scan-jobs";

export async function GET() {
  const latestJob = getLatestScanJob();
  return NextResponse.json({
    ...(await getLatestAnalysis()),
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

  return NextResponse.json(await refreshAnalysis(), { status: 201 });
}
