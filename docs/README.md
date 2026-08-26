# GovGraph Developer Guide

GovGraph is a hackathon product for continuous data governance inside source
code. It looks at how sensitive data moves through a codebase, scores risky
flows, maps them to compliance rules, and shows the result in a dashboard.

The current app is a single Next.js/TypeScript project. It uses mocked
LatentGraph-shaped data today, but the code is split so the real LatentGraph MCP
client can replace the mock later without rewriting the product logic.

## What Exists Today

- A multi-page Next.js product surface:
  `/`, `/findings`, `/graph`, `/remediation`, `/reports`, and `/settings`.
- API route handlers for scan results, findings, remediation previews, and CSV export.
- A short-lived cached scan read path so API bursts do not recompute analysis.
- An opt-in async scan job path for polling-oriented clients.
- Paginated and filterable finding reads.
- A mocked LatentGraph fixture for a legacy claims app.
- A graph normalizer that converts LatentGraph-like file/dependency metadata into GovGraph nodes, edges, and flows.
- A sensitive-field classifier.
- A risk scoring engine.
- A small policy-as-code evaluator.
- A narrative generator.
- A remediation preview generator.
- A Prisma schema for the planned Postgres persistence layer.

## Removing Hardcoded Data

The UI should not import fixture data directly. Product identity and the default
demo repository live in `src/lib/govgraph/product-config.ts`. Page and route
code reads analysis through `src/lib/govgraph/data-provider.ts`.

Current provider mode is controlled by:

```bash
GOVGRAPH_DATA_SOURCE="mock"
```

When the real LatentGraph integration is ready, add a new provider in
`data-provider.ts` and keep the pages unchanged.

## Useful Files

- `src/data/mock-latentgraph.ts`: demo input data.
- `src/lib/govgraph/product-config.ts`: product identity and default demo repo.
- `src/lib/govgraph/data-provider.ts`: provider boundary for mock and future real data.
- `src/lib/govgraph/analysis-service.ts`: runs the full mock analysis pipeline.
- `src/lib/govgraph/scan-jobs.ts`: in-process async scan job manager.
- `src/lib/govgraph/finding-query.ts`: filtering and pagination for findings.
- `src/lib/govgraph/normalizer.ts`: converts LatentGraph-style metadata to GovGraph graph data.
- `src/lib/govgraph/risk-scoring.ts`: assigns risk scores.
- `src/lib/govgraph/policies.ts`: starter compliance rules and evaluator.
- `src/lib/govgraph/remediation.ts`: builds suggested fix cards.
- `src/components/ComplianceDashboard.tsx`: executive overview page composition.
- `src/components/AppShell.tsx`: shared header and navigation.
- `src/components/analysis/*`: reusable panels for graph, findings, metrics,
  charts, and remediation.
- `src/app/api/*/route.ts`: backend API endpoints.
- `src/app/*/page.tsx`: route-specific product pages.
- `src/lib/latentgraph/client.ts`: placeholder boundary for real MCP integration.
- `src/lib/concurrency/batch.ts`: bounded parallel mapping and single-flight helpers.
- `src/lib/cache/ttl-cache.ts`: small TTL cache used at integration boundaries.
- `prisma/schema.prisma`: planned database schema.

## API Notes

- `GET /api/scan` returns the latest cached analysis.
- `POST /api/scan` refreshes the mock analysis synchronously for the demo.
- `POST /api/scan?mode=async` enqueues an in-process scan job and returns `202`.
- `GET /api/scan/jobs/:jobId` returns scan job status.
- `GET /api/findings?severity=high&status=open&page=1&page_size=10` returns a
  filtered page of findings.
- `GET /api/report` accepts the same finding filters and exports the selected
  page as CSV.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

The dev/build scripts use Webpack explicitly because Turbopack hit a local
process/port binding panic in this environment.
