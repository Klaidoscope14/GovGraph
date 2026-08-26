import { refreshMockAnalysis } from "./analysis-service";
import type { ComplianceSummary, GovGraphAnalysis } from "./types";

export type ScanJobStatus = "queued" | "running" | "completed" | "failed";

export interface ScanJobSnapshot {
  id: string;
  repositoryId: string;
  branch: string;
  status: ScanJobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  result?: {
    repository: GovGraphAnalysis["repository"];
    summary: ComplianceSummary;
  };
}

interface StoredScanJob extends ScanJobSnapshot {
  analysis?: GovGraphAnalysis;
}

interface ScanJobStore {
  jobs: Map<string, StoredScanJob>;
  activeJobByConcurrencyKey: Map<string, string>;
  latestJobId: string | null;
  nextJobNumber: number;
}

declare global {
  var __govGraphScanJobStore: ScanJobStore | undefined;
}

const store =
  globalThis.__govGraphScanJobStore ??
  (globalThis.__govGraphScanJobStore = {
    jobs: new Map<string, StoredScanJob>(),
    activeJobByConcurrencyKey: new Map<string, string>(),
    latestJobId: null,
    nextJobNumber: 1
  });

export function enqueueMockScanJob(options: { repositoryId?: string; branch?: string } = {}): ScanJobSnapshot {
  const repositoryId = options.repositoryId ?? "repo_legacy_claims";
  const branch = options.branch ?? "main";
  const concurrencyKey = `${repositoryId}:${branch}`;
  const activeJobId = store.activeJobByConcurrencyKey.get(concurrencyKey);

  if (activeJobId) {
    const activeJob = store.jobs.get(activeJobId);
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "running")) {
      return toSnapshot(activeJob);
    }
  }

  const now = new Date().toISOString();
  const job: StoredScanJob = {
    id: `scan_${String(store.nextJobNumber).padStart(4, "0")}`,
    repositoryId,
    branch,
    status: "queued",
    createdAt: now,
    updatedAt: now
  };

  store.nextJobNumber += 1;
  store.jobs.set(job.id, job);
  store.activeJobByConcurrencyKey.set(concurrencyKey, job.id);
  void runMockScanJob(job.id, concurrencyKey);

  return toSnapshot(job);
}

export function getScanJob(jobId: string): ScanJobSnapshot | null {
  const job = store.jobs.get(jobId);
  return job ? toSnapshot(job) : null;
}

export function getLatestScanJob(): ScanJobSnapshot | null {
  return store.latestJobId ? getScanJob(store.latestJobId) : null;
}

async function runMockScanJob(jobId: string, concurrencyKey: string) {
  const job = store.jobs.get(jobId);
  if (!job) {
    return;
  }

  setJobState(job, { status: "running" });

  try {
    const analysis = await refreshMockAnalysis();
    job.analysis = analysis;
    store.latestJobId = job.id;
    setJobState(job, {
      status: "completed",
      completedAt: new Date().toISOString(),
      result: {
        repository: analysis.repository,
        summary: analysis.summary
      }
    });
  } catch (error) {
    setJobState(job, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown scan failure"
    });
  } finally {
    store.activeJobByConcurrencyKey.delete(concurrencyKey);
  }
}

function setJobState(
  job: StoredScanJob,
  update: Partial<Pick<StoredScanJob, "status" | "completedAt" | "error" | "result">>
) {
  Object.assign(job, update, {
    updatedAt: new Date().toISOString()
  });
}

function toSnapshot(job: StoredScanJob): ScanJobSnapshot {
  return {
    id: job.id,
    repositoryId: job.repositoryId,
    branch: job.branch,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    error: job.error,
    result: job.result
  };
}
