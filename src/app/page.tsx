import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";

export default async function Home() {
  const analysis = await getLatestAnalysis();
  return <ComplianceDashboard initialAnalysis={analysis} />;
}
