# LatentGraph Integration Boundary

GovGraph should keep all LatentGraph-specific behavior in this folder.

Planned flow:

1. The repo ingestor clones or receives a target repository.
2. The operator runs `lgraph start` and `lgraph init` in that target repo, or GovGraph shells out to those commands in a controlled job.
3. GovGraph starts `lgraph mcp` as a stdio MCP server.
4. A TypeScript MCP client calls `get_project_overview`, `get_file`, `get_dependencies`, and `get_call_chain`.
5. The returned metadata is normalized by `src/lib/govgraph/normalizer.ts`.

Implementation notes:

- Use `getFiles` and `getDependenciesForFiles` for bounded parallel calls.
- Keep `toolConcurrency` conservative at first. Six concurrent MCP calls is the
  current default.
- Cache deterministic tool responses by project, branch, tool name, and
  arguments. Add commit SHA to that key as soon as the real repo ingest step
  provides it.

The current MVP intentionally uses fixture data until a real API key and demo
repo are available.
