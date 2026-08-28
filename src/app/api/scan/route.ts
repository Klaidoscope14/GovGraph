import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getLatestAnalysis, refreshAnalysis, scanWithCredentials, getLastCredentials } from "@/lib/govgraph/data-provider";
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

  let body: Record<string, unknown> = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // No body — proceed with re-scan
  }

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : undefined;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : undefined;
  const branch = typeof body.branch === "string" ? body.branch.trim() : undefined;

  // Fresh scan with explicit credentials from landing page
  if (projectId && apiKey) {
    try {
      const analysis = await scanWithCredentials({ projectId, apiKey, branch });
      return NextResponse.json(analysis, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Re-scan: use stored credentials or env fallback
  try {
    const analysis = await refreshAnalysis();
    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Re-scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
