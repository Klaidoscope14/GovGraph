# GovGraph

GovGraph is a hackathon MVP for continuous source-code-level data governance.
It uses LatentGraph as the code intelligence layer and adds sensitive-field
classification, risk scoring, policy evaluation, audit narratives, and
remediation previews.

## Local Development

```bash
npm install
npm run dev
```

The first version runs against mocked LatentGraph-shaped fixture data so the
dashboard, scoring, and policy flow can be built before a real project key is
available.

## Documentation

- `docs/README.md`: developer overview.
- `docs/components.md`: simple explanation of each product component.
- `docs/scalability-concurrency-latency.md`: scaling, concurrency, and latency plan.
- `docs/checks-and-blockers.md`: current verification results and known blockers.

## Real LatentGraph Integration

The app is structured so `src/lib/latentgraph/client.ts` is the only place that
needs to know about MCP. Once a project is indexed with `lgraph init`, replace
the mock provider in `src/lib/govgraph/analysis-service.ts` with the
`LatentGraphMcpClient`.
