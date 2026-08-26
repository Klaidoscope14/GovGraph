import {
  getLatestMockAnalysis,
  refreshMockAnalysis,
  runMockAnalysis
} from "./analysis-service";
import { getDataSourceConfig } from "./product-config";
import type { GovGraphAnalysis } from "./types";

export interface AnalysisDataProvider {
  mode: string;
  label: string;
  getLatestAnalysis(): Promise<GovGraphAnalysis>;
  refreshAnalysis(): Promise<GovGraphAnalysis>;
}

const mockProvider: AnalysisDataProvider = {
  mode: "mock",
  label: "Mock fixture",
  getLatestAnalysis: getLatestMockAnalysis,
  refreshAnalysis: refreshMockAnalysis
};

const providers: Record<string, AnalysisDataProvider> = {
  mock: mockProvider
};

export function getAnalysisProvider(): AnalysisDataProvider {
  return providers[getDataSourceConfig().mode] ?? mockProvider;
}

export async function getLatestAnalysis() {
  return getAnalysisProvider().getLatestAnalysis();
}

export async function refreshAnalysis() {
  return getAnalysisProvider().refreshAnalysis();
}

export function runFixtureAnalysisForTests() {
  return runMockAnalysis();
}
