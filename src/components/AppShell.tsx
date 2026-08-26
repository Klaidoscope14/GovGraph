"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { productConfig } from "@/lib/govgraph/product-config";

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/findings", label: "Findings", icon: ListChecks },
  { href: "/graph", label: "Graph", icon: GitBranch },
  { href: "/remediation", label: "Remediation", icon: Wrench },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <body className="bg-mist text-ink">
      <div className="min-h-screen">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <Link className="flex items-center gap-3" href="/">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-line bg-[#eef5f3]">
                <ShieldCheck className="h-5 w-5 text-[#25795f]" />
              </div>
              <div>
                <div className="text-xl font-semibold tracking-normal">{productConfig.name}</div>
                <div className="text-sm text-[#5f6d79]">{productConfig.tagline}</div>
              </div>
            </Link>
            <nav className="flex gap-1 overflow-x-auto rounded-md border border-line bg-[#f8fafb] p-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                      isActive ? "bg-white text-ink shadow-panel" : "text-[#5f6d79] hover:bg-white hover:text-ink"
                    }`}
                    href={item.href as Route}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </body>
  );
}
