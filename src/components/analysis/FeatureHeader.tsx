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
    <div className="flex flex-col gap-4 border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-[#697784]">{eyebrow}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6d79]">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f6d79]">
            <span className="rounded-md border border-line bg-[#f8fafb] px-2 py-1">
              {analysis.repository.name}
            </span>
            <span className="rounded-md border border-line bg-[#f8fafb] px-2 py-1">
              {analysis.repository.branch}
            </span>
            <span className="rounded-md border border-line bg-[#f8fafb] px-2 py-1">
              {analysis.repository.commitSha}
            </span>
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
