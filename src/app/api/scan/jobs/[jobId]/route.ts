import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getScanJob } from "@/lib/govgraph/scan-jobs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getScanJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Scan job not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}

