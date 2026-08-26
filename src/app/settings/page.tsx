import type { ReactNode } from "react";
import { Database, KeyRound, ServerCog } from "lucide-react";
import { FeatureHeader } from "@/components/analysis/FeatureHeader";
import { getAnalysisProvider, getLatestAnalysis } from "@/lib/govgraph/data-provider";
import { getDataSourceConfig, productConfig } from "@/lib/govgraph/product-config";

export default async function SettingsPage() {
  const analysis = await getLatestAnalysis();
  const provider = getAnalysisProvider();
  const dataSource = getDataSourceConfig();

  return (
    <main>
      <FeatureHeader
        analysis={analysis}
        eyebrow="Settings"
        title="Connect repositories and analysis providers"
        description="Keep environment, data-source, and integration status separate from the product surfaces used by reviewers."
      />
      <div className="mx-auto grid max-w-[1480px] gap-5 px-5 py-5 xl:grid-cols-3">
        <SettingCard
          icon={<Database className="h-5 w-5 text-[#25795f]" />}
          title="Data Source"
          rows={[
            ["Current mode", provider.mode],
            ["Provider label", provider.label],
            ["Configured env", dataSource.mode]
          ]}
        />
        <SettingCard
          icon={<ServerCog className="h-5 w-5 text-[#486474]" />}
          title="Repository"
          rows={[
            ["Default repo", productConfig.defaultRepository.name],
            ["Branch", productConfig.defaultRepository.branch],
            ["Commit", productConfig.defaultRepository.commitSha]
          ]}
        />
        <SettingCard
          icon={<KeyRound className="h-5 w-5 text-[#896515]" />}
          title="Integration Readiness"
          rows={[
            ["LatentGraph MCP", provider.mode === "latentgraph" ? "configured" : "pending"],
            ["Postgres persistence", "schema ready"],
            ["GitHub PR creation", "stretch"]
          ]}
        />
      </div>
    </main>
  );
}

function SettingCard({
  icon,
  title,
  rows
}: {
  icon: ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 p-4 text-sm">
        {rows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-4" key={label}>
            <span className="text-[#5f6d79]">{label}</span>
            <span className="max-w-[190px] truncate font-medium">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
