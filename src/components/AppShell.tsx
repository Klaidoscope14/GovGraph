"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { productConfig } from "@/lib/govgraph/product-config";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-5 py-4">
          <Link className="flex items-center gap-3" href="/dashboard">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-accent/30 bg-accent-subtle">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-heading text-xl font-semibold tracking-normal">{productConfig.name}</div>
              <div className="text-xs text-text-secondary">{productConfig.tagline}</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              className="text-sm text-text-secondary transition-colors hover:text-ink"
              href={"/dashboard" as Route}
            >
              Dashboard
            </Link>
            <Link
              className="text-sm text-text-secondary transition-colors hover:text-ink"
              href={"/dashboard/data-flow" as Route}
            >
              Data Flow
            </Link>
            <Link
              className="text-sm text-text-secondary transition-colors hover:text-ink"
              href={"/reports" as Route}
            >
              Reports
            </Link>
            <Link
              className="text-sm text-text-secondary transition-colors hover:text-ink"
              href={"/about" as Route}
            >
              About
            </Link>
            <Link
              className="text-sm text-text-secondary transition-colors hover:text-ink"
              href={"/" as Route}
            >
              New Scan
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
