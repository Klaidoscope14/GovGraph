import type {
  LatentGraphDependencySummary,
  LatentGraphFileSummary,
  LatentGraphFixture
} from "@/lib/govgraph/types";
import { TtlCache, stableCacheKey } from "@/lib/cache/ttl-cache";
import { mapWithConcurrency } from "@/lib/concurrency/batch";

export interface LatentGraphClient {
  getProjectOverview(): Promise<LatentGraphFixture["overview"]>;
  getFile(filePath: string): Promise<LatentGraphFileSummary>;
  getFiles(filePaths: readonly string[]): Promise<LatentGraphFileSummary[]>;
  getDependencies(filePath: string): Promise<LatentGraphDependencySummary>;
  getDependenciesForFiles(filePaths: readonly string[]): Promise<LatentGraphDependencySummary[]>;
}

export class LatentGraphMcpClient implements LatentGraphClient {
  private readonly cache = new TtlCache<unknown>(60_000);

  constructor(
    private readonly options: {
      projectId?: string;
      branch?: string;
      toolConcurrency?: number;
    } = {}
  ) {}

  async getProjectOverview(): Promise<LatentGraphFixture["overview"]> {
    return this.callTool("get_project_overview", {});
  }

  async getFile(filePath: string): Promise<LatentGraphFileSummary> {
    return this.callTool("get_file", { file_path: filePath });
  }

  async getFiles(filePaths: readonly string[]): Promise<LatentGraphFileSummary[]> {
    return mapWithConcurrency(filePaths, this.options.toolConcurrency ?? 6, (filePath) => this.getFile(filePath));
  }

  async getDependencies(filePath: string): Promise<LatentGraphDependencySummary> {
    return this.callTool("get_dependencies", { file_path: filePath });
  }

  async getDependenciesForFiles(filePaths: readonly string[]): Promise<LatentGraphDependencySummary[]> {
    return mapWithConcurrency(filePaths, this.options.toolConcurrency ?? 6, (filePath) => this.getDependencies(filePath));
  }

  private async callTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    const cacheKey = stableCacheKey([
      this.options.projectId ?? "default-project",
      this.options.branch ?? "default-branch",
      toolName,
      args
    ]);
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached as T;
    }

    const result = await this.executeTool<T>(toolName, args);
    this.cache.set(cacheKey, result);
    return result;
  }

  private async executeTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    void toolName;
    void args;
    throw new Error(
      "LatentGraph MCP client is not wired yet. Use mocked fixture data until lgraph credentials and target repo are available."
    );
  }
}
