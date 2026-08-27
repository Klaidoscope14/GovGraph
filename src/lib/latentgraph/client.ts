import type {
  LatentGraphDependencySummary,
  LatentGraphFileSummary,
  LatentGraphFixture
} from "@/lib/govgraph/types";
import { TtlCache, stableCacheKey } from "@/lib/cache/ttl-cache";
import { mapWithConcurrency } from "@/lib/concurrency/batch";
import { parseToonResponse, ToonParseError } from "./toon-parser";

export interface AskCodebaseResponse {
  answer?: string;
  confidence?: string;
  citations?: string[];
  fallback_targets?: string[];
  degraded?: boolean;
}

export interface LatentGraphClient {
  getProjectOverview(): Promise<LatentGraphFixture["overview"]>;
  getFile(filePath: string): Promise<LatentGraphFileSummary>;
  getFiles(filePaths: readonly string[]): Promise<LatentGraphFileSummary[]>;
  getDependencies(filePath: string): Promise<LatentGraphDependencySummary>;
  getDependenciesForFiles(filePaths: readonly string[]): Promise<LatentGraphDependencySummary[]>;
  askCodebase(question: string, topN?: number): Promise<AskCodebaseResponse>;
}

interface McpConnection {
  callTool: (name: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }>;
  close: () => Promise<void>;
}

declare global {
  var __latentGraphMcpConnection: McpConnection | null | undefined;
  var __latentGraphMcpCredentials: string | undefined;
}

export class LatentGraphMcpClient implements LatentGraphClient {
  private readonly cache = new TtlCache<unknown>(60_000);
  private connectPromise: Promise<McpConnection> | null = null;
  private readonly credentialKey: string;

  constructor(
    private readonly options: {
      projectId?: string;
      branch?: string;
      apiKey?: string;
      toolConcurrency?: number;
    } = {}
  ) {
    this.credentialKey = `${options.projectId}:${options.apiKey}:${options.branch}`;
  }

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

  async askCodebase(question: string, topN = 10): Promise<AskCodebaseResponse> {
    return this.callTool("ask_codebase", { question, top_n: topN });
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
    const connection = await this.getConnection();
    const result = await connection.callTool(toolName, args);

    const textBlock = result.content.find((block) => block.type === "text" && block.text);
    if (!textBlock?.text) {
      throw new Error(`LatentGraph tool ${toolName} returned no text content`);
    }

    console.log(`[GovGraph] Raw MCP text for ${toolName} (full length: ${textBlock.text.length}):\n`, textBlock.text.slice(0, 3000));

    try {
      return await parseToonResponse<T>(textBlock.text);
    } catch (error) {
      console.error(`[GovGraph] TOON parse failed for ${toolName}`);
      if (error instanceof ToonParseError) {
        throw new Error(
          `LatentGraph ${toolName}: ${error.cause instanceof Error ? error.cause.message : error.message}`
        );
      }
      throw error;
    }
  }

  private async getConnection(): Promise<McpConnection> {
    // Close existing connection if credentials changed (different project)
    if (globalThis.__latentGraphMcpConnection && globalThis.__latentGraphMcpCredentials !== this.credentialKey) {
      console.log("[GovGraph] Credentials changed, closing existing MCP connection");
      await globalThis.__latentGraphMcpConnection.close().catch(() => {});
      globalThis.__latentGraphMcpConnection = null;
    }

    if (globalThis.__latentGraphMcpConnection) {
      return globalThis.__latentGraphMcpConnection;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.createConnection();
    }

    return this.connectPromise;
  }

  private async createConnection(): Promise<McpConnection> {
    const { Client } = await import("@modelcontextprotocol/sdk/client");
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio");

    const env: Record<string, string> = {
      ...process.env as Record<string, string>
    };

    if (this.options.projectId) env.LGRAPH_PROJECT_ID = this.options.projectId;
    if (this.options.apiKey) env.LGRAPH_API_KEY = this.options.apiKey;
    if (this.options.branch) env.LGRAPH_BRANCH = this.options.branch;

    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@latentforce/latentgraph", "mcp"],
      env
    });

    const client = new Client({
      name: "govgraph",
      version: "0.1.0"
    });

    await client.connect(transport);

    const connection: McpConnection = {
      callTool: async (name, toolArgs) => {
        const result = await client.callTool({ name, arguments: toolArgs });
        return result as { content: Array<{ type: string; text?: string }> };
      },
      close: async () => {
        await client.close();
        globalThis.__latentGraphMcpConnection = null;
      }
    };

    globalThis.__latentGraphMcpConnection = connection;
    globalThis.__latentGraphMcpCredentials = this.credentialKey;
    return connection;
  }
}
