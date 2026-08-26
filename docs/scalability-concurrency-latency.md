# Scalability, Concurrency, And Latency Plan

This document describes how to make GovGraph faster and more scalable as the
mock MVP turns into a real product.

## Current MVP Shape

The current app runs analysis from a small fixture. The route handlers now read
through a short-lived in-memory cache, and an opt-in in-process async scan path
exists for clients that want to poll job status. That is enough for the demo,
but a real scan can take minutes and may touch hundreds or thousands of files.

The production shape should split work into two paths:

- request path: fast API responses for the dashboard
- worker path: slower repository scans and graph analysis

## Scalability Improvements

### 1. Move Scans To Background Jobs

Do not run a full repo scan inside a Next.js route handler. Route handlers should
enqueue work and return a `scan_id`.

Recommended flow:

1. User submits a repo.
2. API creates a `Scan` row with status `QUEUED`.
3. API enqueues a scan job.
4. Worker runs LatentGraph indexing and normalization.
5. Worker stores graph snapshots, scored flows, and findings.
6. Dashboard polls or subscribes to scan status.

Suggested tools:

- BullMQ plus Redis for a fast hackathon implementation.
- Cloud queues later, such as SQS, Pub/Sub, or Temporal.

Current code: `src/lib/govgraph/scan-jobs.ts` provides the first version of this
contract with `POST /api/scan?mode=async` and `GET /api/scan/jobs/:jobId`.
It is stored on `globalThis` so local Next route modules can share it, but it is
still in-memory only and should be replaced with a durable queue before
production.

### 2. Store Immutable Graph Snapshots

Every scan should produce an immutable snapshot. This makes before/after
comparison easy and avoids corrupting historical audit evidence.

Use:

- `Scan` for scan metadata
- `GraphSnapshot` for nodes, edges, and flows
- `Finding` for policy violations
- `AuditEvent` for human actions and system decisions

### 3. Process Large Repos By Module

For large repos, analyze and normalize one module or directory at a time.

Benefits:

- smaller memory spikes
- easier retries
- faster partial updates
- better progress reporting

### 4. Use Incremental Analysis

After the first full scan, do not reprocess the whole repo every time.

Use git diffs to find changed files, then:

- refresh only changed LatentGraph metadata
- recompute flows that touch changed files
- recompute findings for affected paths
- keep old findings if unrelated paths did not change

### 5. Cache LatentGraph Tool Results

LatentGraph calls may be network-bound and rate-limited. Cache responses by:

- project id
- branch
- commit SHA
- tool name
- tool arguments

For example, `get_file("claims/api.py")` at commit `abc123` is deterministic and
safe to reuse.

Current code: `src/lib/cache/ttl-cache.ts` provides a small TTL cache, and
`src/lib/latentgraph/client.ts` uses stable keys around the future MCP calls.

### 6. Use Database Indexes Early

Add indexes when persistence is wired:

- `Scan(repositoryId, createdAt)`
- `Finding(scanId, severity)`
- `Finding(scanId, status)`
- `Finding(pathId)`
- JSONB GIN index on graph fields only if querying inside graph JSON becomes common

## Concurrency Improvements

### 1. Limit Work Per Repo

Only one active scan should run per repository and branch at a time. This avoids
duplicated LatentGraph indexing and inconsistent snapshots.

Use a concurrency key like:

```text
repo_id + branch
```

Current code: the in-process scan job manager uses `repositoryId + branch` to
avoid duplicate active mock scans.

### 2. Parallelize Independent File Work

Classification, scoring, and policy evaluation can run concurrently because
they are pure logic once the graph is normalized.

Good candidates for parallel work:

- classify fields per edge
- score flows per path
- evaluate rules per flow
- generate narratives per finding

Keep concurrency bounded. A good starting point is `min(cpu_count, 8)`.

Current code: `src/lib/concurrency/batch.ts` includes `mapWithConcurrency`.
The LatentGraph client exposes `getFiles` and `getDependenciesForFiles` using
a default concurrency of 6.

### 3. Batch LatentGraph MCP Calls

The MCP tools are individual calls. Avoid one call per UI interaction when
building full scans.

Recommended approach:

- call `get_project_overview`
- discover modules and files
- call `get_file` and `get_dependencies` in bounded parallel batches
- call `get_call_chain` only for high-risk symbols or when extra detail is needed
- cap `ask_codebase` usage because it is rate-limited and more expensive

### 4. Make Jobs Idempotent

Workers should safely retry after failures.

Use stable identifiers:

- scan id
- commit SHA
- file path
- LatentGraph tool arguments
- policy rule id

If a job retries, it should update the same scan instead of creating duplicate
findings.

### 5. Separate CPU And I/O Queues

LatentGraph calls and GitHub calls are I/O-heavy. Scoring and policy evaluation
are CPU-light today but may become CPU-heavy on large graphs.

Use separate queues later:

- `repo_ingest`
- `latentgraph_fetch`
- `graph_normalize`
- `policy_eval`
- `report_export`
- `remediation`

## Latency Optimisations

### 1. Return Cached Dashboard Data

The dashboard should read from stored scan results. It should not recompute the
analysis on every page load.

Current MVP recomputes from fixture data because the data is tiny. Once Postgres
is wired, `/api/scan` should read the latest completed scan.

Current code: `GET /api/scan`, `/api/findings`, `/api/remediation`, `/api/report`,
and the dashboard page all read from `getLatestMockAnalysis()`. `POST /api/scan`
forces a refresh for the demo run button.

### 2. Stream Scan Progress

Use Server-Sent Events or WebSockets for progress updates:

- `queued`
- `cloning`
- `indexing`
- `normalizing`
- `scoring`
- `evaluating policies`
- `complete`

This makes long scans feel responsive.

### 3. Send Less Graph Data To The Browser

Large React Flow graphs can become slow. Send a summarized graph first, then
load details on demand.

Recommended UI strategy:

- first load: top risky flows and module-level nodes
- click module: load contained files
- click flow: load edge evidence and call-chain details

### 4. Precompute Common Views

Precompute and store:

- severity counts
- regulation counts
- top risky flows
- latest open findings
- remediation candidates

This keeps dashboard API responses small and fast.

### 5. Use Pagination And Filtering

Never send every finding in a large repo at once. Add query parameters:

```text
/api/findings?severity=high&status=open&page=1&page_size=50
```

Current code: `/api/findings` and `/api/report` support these query parameters.

### 6. Defer Expensive Narratives

Generate simple templated narratives immediately. Use LLM-polished narratives
only for selected findings, reports, or executive exports.

### 7. Keep Remediation Async

Patch generation should not block the findings page. Show findings first, then
generate remediation previews in the background for eligible violations.

### 8. Use Webpack Until Turbopack Is Stable Here

Next 16 defaults to Turbopack, but this host hit a Turbopack panic during CSS
build processing. The project scripts use Webpack explicitly:

```json
"dev": "next dev --webpack",
"build": "next build --webpack"
```

That is currently the lower-latency path for local development because it avoids
the panic/retry cycle.

## Recommended Next Engineering Steps

1. Persist scan jobs and latest completed results in Postgres.
2. Replace the in-process async scan manager with BullMQ plus Redis.
3. Implement the real LatentGraph MCP `executeTool` method.
4. Add durable LatentGraph tool-result caching keyed by commit SHA.
5. Add progress events through Server-Sent Events or WebSockets.
6. Add before/after scan diffing for the CI-gate demo.
7. Add simple load tests around graph sizes of 100, 1,000, and 10,000 edges.
