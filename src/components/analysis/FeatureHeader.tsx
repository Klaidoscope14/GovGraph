import type { ReactNode } from "react";
import type { GovGraphAnalysis } from "@/lib/govgraph/types";

export function FeatureHeader({
  eyebrow,
  title,
  description,
  analysis,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  analysis: GovGraphAnalysis;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="animate-fade-in">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</div>
          <h1 className="mt-1.5 font-heading text-xl font-semibold tracking-normal sm:text-2xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="rounded-md border border-line bg-elevated px-2 py-1">
              {analysis.repository.name}
            </span>
            <span className="rounded-md border border-line bg-elevated px-2 py-1">
              {analysis.repository.branch}
            </span>
            <span className="rounded-md border border-line bg-elevated px-2 py-1 font-mono">
              {analysis.repository.commitSha}
            </span>
          </div>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      <div className="h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
    </div>
  );
}
