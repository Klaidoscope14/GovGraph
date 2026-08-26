import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { getLatestMockAnalysis } from "@/lib/govgraph/analysis-service";

export default async function Home() {
  const analysis = await getLatestMockAnalysis();
  return <ComplianceDashboard initialAnalysis={analysis} />;
}
