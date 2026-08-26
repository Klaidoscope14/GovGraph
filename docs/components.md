# Product Components

This document explains each GovGraph component in simple terms.

## 1. Repo Ingestor

The Repo Ingestor accepts a GitHub URL or local path for the codebase to scan.
In the final product, it will clone or fetch the repository and prepare a clean
working directory for analysis.

Current status: planned. The mock app starts after this step and assumes a repo
has already been analyzed.

## 2. LatentGraph Integration

LatentGraph is the code intelligence engine. It indexes a repository and exposes
metadata through MCP tools such as `get_file`, `get_dependencies`,
`get_call_chain`, and `ask_codebase`.

GovGraph should not import LatentGraph source code. It should start or connect
to the `lgraph` MCP server and call its tools as a client.

Current status: placeholder exists in `src/lib/latentgraph/client.ts`. Mock data
is used until a real API key and demo repo are available.

## 3. Graph Normalizer

The Graph Normalizer converts LatentGraph output into GovGraph's own stable
schema. This matters because the rest of the app should not care about the exact
shape of LatentGraph responses.

Input: file summaries, symbols, dependencies, storage hints, API endpoints.

Output: nodes, edges, and data-flow paths.

Current status: implemented in `src/lib/govgraph/normalizer.ts`.

## 4. Sensitive Data Classifier

The classifier looks for names that suggest sensitive data, such as `ssn`,
`email`, `password`, `api_key`, `account_number`, and `card`.

It groups fields into:

- `PII`
- `SECRET`
- `FINANCIAL`
- `UNKNOWN`

Current status: implemented in `src/lib/govgraph/sensitive-classifier.ts`.

## 5. Risk Scoring Engine

The scoring engine assigns a 0-100 risk score to every sensitive flow. It also
explains the score in plain English.

It considers:

- how quickly data reaches a trust boundary
- whether encryption is missing or unknown
- how dangerous the sink is, such as logs or external systems
- how sensitive the field is
- whether the flow is documented

Current status: implemented in `src/lib/govgraph/risk-scoring.ts`.

## 6. Policy Engine

The policy engine evaluates scored flows against structured rules. Rules are
small data objects, not scattered `if` statements.

Example rule: personal data that crosses a trust boundary without encryption
violates GDPR Article 32.

Current status: implemented in `src/lib/govgraph/policies.ts` with starter
rules for GDPR and SOC2.

## 7. Findings Store

Findings are policy violations. Each finding includes the rule, regulation,
severity, score, evidence path, and human-readable narrative.

Current status: findings are generated in memory. The Prisma schema includes a
`Finding` table for the next persistence step.

## 8. Narrative Generator

The narrative generator turns technical graph facts into language a compliance
officer or auditor can read.

It explains what sensitive field moved from where to where, which regulation was
violated, and why the flow is risky.

Current status: implemented in `src/lib/govgraph/narrative.ts`.

## 9. Remediation Engine

The remediation engine proposes a fix for selected findings. It does not blindly
auto-merge changes. It marks a fix as either PR-ready or needing review.

This supports the product story: governance tools should know when not to act
autonomously.

Current status: remediation previews are implemented in
`src/lib/govgraph/remediation.ts`. Real patch generation and GitHub PR creation
are still stretch work.

## 10. Dashboard API

The API routes serve product data to the frontend:

- `/api/scan`: full scan result
- `/api/findings`: findings and summary
- `/api/remediation`: suggested fixes
- `/api/report`: CSV export

Current status: implemented with mock-backed data. `GET /api/scan` uses a
short-lived cached analysis, while `POST /api/scan` refreshes the demo scan.
`POST /api/scan?mode=async` starts an in-process scan job, and
`GET /api/scan/jobs/:jobId` returns its status.

`/api/findings` supports `severity`, `status`, `page`, and `page_size` query
parameters. `/api/report` uses the same filters for CSV export.

## 11. Frontend Dashboard

The dashboard is the main demo surface. It shows:

- repo and scan identity
- overall risk metrics
- interactive data-flow graph
- policy distribution chart
- finding list
- remediation preview cards
- CSV export

Current status: implemented in `src/components/ComplianceDashboard.tsx`.
The dashboard avoids repeated linear lookups when rendering graph edges,
charts, and remediation cards, which keeps the current UI path healthier as the
graph grows.

## 12. Graph Store

The Graph Store persists normalized nodes, edges, and flows. For hackathon
scale, Postgres JSONB is enough. A graph database can be a roadmap item.

Current status: Prisma schema includes `GraphSnapshot`, but route handlers still
use in-memory mock data. The analysis service now exposes a cached latest-scan
read path that should later be backed by this table.

## 13. Audit Ledger

The audit ledger records who scanned, what was found, what was fixed, and what
was accepted or dismissed.

This is important for GDPR Article 30 and SOC2 evidence.

Current status: Prisma schema includes `AuditEvent`. UI and API actions for the
ledger are still planned.

## 14. CI Gate

The CI gate runs analysis on pull requests and flags only new violations. This
turns GovGraph from a one-time report into continuous compliance.

Current status: planned. A before/after demo view is a strong next step.

## 15. GitHub Integration

GitHub integration will support repo ingestion, PR previews, optional real PR
creation, and CI comments.

Current status: planned. The current product deliberately treats PR creation as
a stretch goal.
