# Checks And Blockers

This file records the current setup state so a new developer can quickly see
what is working and what remains.

## Checks Performed

Dependency installation:

```bash
npm install
```

Prisma generation:

```bash
npm run prisma:generate
```

TypeScript:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

Security audit:

```bash
npm audit --audit-level=moderate
```

Local endpoint checks against the running dev server:

```bash
curl http://127.0.0.1:3000/api/scan
curl -X POST http://127.0.0.1:3000/api/scan?mode=async
curl http://127.0.0.1:3000/api/scan/jobs/:jobId
curl http://127.0.0.1:3000/api/findings
curl "http://127.0.0.1:3000/api/findings?severity=high&page=1&page_size=3"
curl http://127.0.0.1:3000/api/remediation
curl http://127.0.0.1:3000/api/report
curl http://127.0.0.1:3000/
curl http://127.0.0.1:3000/findings
curl http://127.0.0.1:3000/graph
curl http://127.0.0.1:3000/remediation
curl http://127.0.0.1:3000/reports
curl http://127.0.0.1:3000/settings
```

## Current Results

- Dependencies are installed.
- Prisma Client is generated.
- `npm run typecheck` passes.
- `npm run build` passes.
- `npm audit --audit-level=moderate` reports zero vulnerabilities.
- `/api/scan` returns the mock LegacyClaims analysis with 13 nodes, 11 edges,
  and 26 open findings.
- `POST /api/scan?mode=async` creates an in-process scan job.
- `/api/scan/jobs/:jobId` returns scan job status.
- `/api/findings` returns 26 findings: 2 critical and 6 high.
- `/api/findings?severity=high&page=1&page_size=3` returns a 3-item high-severity
  page with pagination metadata.
- `/api/remediation` returns 4 remediation previews.
- `/api/report` returns CSV output.
- `/` returns the dashboard HTML with HTTP 200.
- `/findings`, `/graph`, `/remediation`, `/reports`, and `/settings` render as
  separate feature pages.

## Known Notes

### Turbopack Panic

Next 16 defaulted to Turbopack and failed in this environment while processing
CSS. The error involved creating a process and binding to a local port.

Resolution: the app uses Webpack explicitly in `package.json`.

### Optional Sharp Packages

`npm ls --depth=0` may show two optional Sharp-related packages as extraneous:

- `@emnapi/runtime`
- `@img/sharp-wasm32`

They are optional packages present in the lockfile as part of Next/Sharp image
tooling. They do not currently block type-check, build, Prisma generation, or
security audit.

### Next-Generated Agent Files

Running `next dev` generated `AGENTS.md` and `CLAUDE.md` in the app folder.
They contain Next.js version guidance and are expected with this Next release.

### Next Dev Type Cache

This environment produced duplicate files inside `.next/dev/types` with names
ending in ` 2.ts`. `tsconfig.json` excludes those duplicate generated files so
`npm run check` remains stable.

### Localhost Sandbox Note

Inside this Codex environment, plain sandboxed `curl` calls to `127.0.0.1`
can fail with `Operation not permitted`. The app is healthy; the final endpoint
checks were run with local network permission against the dev server.

### In-Memory Job Store

The async scan job path is intentionally in-memory for the hackathon MVP. It
uses `globalThis` so multiple Next route modules in the same local server can
see the same jobs, but it is not durable across process restarts.

## Remaining Product Work

The current product is a strong mock-backed MVP, but these areas remain:

- real LatentGraph MCP client implementation
- repo ingestion from GitHub/local path
- Postgres persistence in API routes
- durable background scan jobs with Redis or a managed queue
- scan progress updates
- audit ledger actions
- before/after CI gate diff
- real remediation patch generation
- optional GitHub PR creation
