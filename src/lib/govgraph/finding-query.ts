import type { FindingStatus, GovGraphAnalysis, Severity, Violation } from "./types";

const severities: Severity[] = ["critical", "high", "medium", "low"];
const statuses: FindingStatus[] = ["open", "accepted_risk", "fixed", "dismissed"];
const maxPageSize = 100;
const defaultPageSize = 50;

export interface FindingQuery {
  severity: Severity | "all";
  status: FindingStatus | "all";
  page: number;
  pageSize: number;
}

export interface FindingPage {
  findings: Violation[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: FindingQuery;
}

export function parseFindingQuery(searchParams: URLSearchParams): FindingQuery {
  const severity = parseEnum(searchParams.get("severity"), severities) ?? "all";
  const status = parseEnum(searchParams.get("status"), statuses) ?? "all";
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const requestedPageSize = parsePositiveInteger(
    searchParams.get("page_size") ?? searchParams.get("pageSize"),
    defaultPageSize
  );

  return {
    severity,
    status,
    page,
    pageSize: Math.min(requestedPageSize, maxPageSize)
  };
}

export function queryFindings(analysis: GovGraphAnalysis, query: FindingQuery): FindingPage {
  const filtered = analysis.findings.filter((finding) => {
    const severityMatches = query.severity === "all" || finding.severity === query.severity;
    const statusMatches = query.status === "all" || finding.status === query.status;
    return severityMatches && statusMatches;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;
  const findings = filtered.slice(start, start + query.pageSize);

  return {
    findings,
    pagination: {
      page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    filters: {
      ...query,
      page
    }
  };
}

function parseEnum<TValue extends string>(value: string | null, allowedValues: readonly TValue[]) {
  if (!value || value === "all") {
    return null;
  }

  return allowedValues.includes(value as TValue) ? (value as TValue) : null;
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

