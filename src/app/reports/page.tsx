import { Download, FileText } from "lucide-react";
import { FeatureHeader } from "@/components/analysis/FeatureHeader";
import { severityColors } from "@/components/analysis/display";
import { getLatestAnalysis } from "@/lib/govgraph/data-provider";
import type { Severity } from "@/lib/govgraph/types";

export default async function ReportsPage() {
  const analysis = await getLatestAnalysis();
  const severities: Severity[] = ["critical", "high", "medium", "low"];

  return (
    <main>
      <FeatureHeader
        analysis={analysis}
        eyebrow="Reports"
        title="Export auditor-ready evidence"
        description="Package policy violations, affected fields, source-to-sink paths, and narratives for compliance review."
      />
      <div className="mx-auto grid max-w-[1480px] gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-line bg-white shadow-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <FileText className="h-4 w-4 text-[#486474]" />
            <h2 className="text-sm font-semibold">Evidence Exports</h2>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <ReportLink href="/api/report" label="All findings CSV" count={analysis.findings.length} />
            {severities.map((severity) => (
              <ReportLink
                count={analysis.findings.filter((finding) => finding.severity === severity).length}
                href={`/api/report?severity=${severity}`}
                key={severity}
                label={`${severity[0].toUpperCase()}${severity.slice(1)} findings CSV`}
                tone={severity}
              />
            ))}
          </div>
        </section>
        <aside className="rounded-lg border border-line bg-white shadow-panel">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Audit Snapshot</h2>
          </div>
          <div className="space-y-3 p-4 text-sm">
            <SnapshotRow label="Repository" value={analysis.repository.name} />
            <SnapshotRow label="Branch" value={analysis.repository.branch} />
            <SnapshotRow label="Commit" value={analysis.repository.commitSha} />
            <SnapshotRow label="Open findings" value={String(analysis.summary.openFindings)} />
            <SnapshotRow label="Regulated flows" value={String(analysis.summary.regulatedFlows)} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function ReportLink({
  href,
  label,
  count,
  tone = "low"
}: {
  href: string;
  label: string;
  count: number;
  tone?: Severity;
}) {
  return (
    <a className="rounded-lg border border-line p-4 hover:bg-[#f8fafb]" href={href}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="mt-1 text-xs text-[#5f6d79]">{count} rows</p>
        </div>
        <Download className="h-4 w-4" style={{ color: severityColors[tone] }} />
      </div>
    </a>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#5f6d79]">{label}</span>
      <span className="max-w-[220px] truncate font-medium">{value}</span>
    </div>
  );
}

