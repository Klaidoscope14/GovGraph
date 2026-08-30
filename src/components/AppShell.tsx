"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { productConfig } from "@/lib/govgraph/product-config";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5 sm:py-4">
          <Link className="flex items-center gap-3" href="/dashboard">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-accent/30 bg-accent-subtle">
              <ShieldCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-heading text-lg font-semibold tracking-normal sm:text-xl">{productConfig.name}</div>
              <div className="hidden text-xs text-text-secondary sm:block">{productConfig.tagline}</div>
            </div>
          </Link>
          <nav className="-mx-1 flex items-center gap-1 overflow-x-auto sm:mx-0 sm:gap-2">
            <Link
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
              href={"/dashboard" as Route}
            >
              Dashboard
            </Link>
            <Link
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
              href={"/dashboard/data-flow" as Route}
            >
              Data Flow
            </Link>
            <Link
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
              href={"/reports" as Route}
            >
              Reports
            </Link>
            <Link
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-ink"
              href={"/about" as Route}
            >
              About
            </Link>
            <Link
              className="whitespace-nowrap rounded-md border border-line px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:border-accent/40 hover:bg-elevated hover:text-ink"
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
