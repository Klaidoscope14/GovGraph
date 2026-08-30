import {
  ShieldCheck,
  GitBranch,
  Lock,
  Eye,
  Zap,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-5">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-accent/30 bg-accent-subtle shadow-glow">
              <ShieldCheck className="h-7 w-7 text-accent" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">GovGraph</h1>
              <p className="mt-1 text-text-secondary">
                Continuous source-code-level data governance and compliance
              </p>
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-5">
        <section className="glass-card animate-fade-in p-6">
          <h2 className="font-heading text-xl font-semibold">What is GovGraph?</h2>
          <p className="mt-3 max-w-3xl leading-7 text-text-secondary">
            GovGraph is a continuous data governance and compliance platform built for legacy
            codebases. It connects to your repository via LatentGraph&apos;s MCP (Model Context
            Protocol) server, analyzes how sensitive data flows through your code, and surfaces
            compliance violations with evidence-backed risk scores.
          </p>
          <p className="mt-3 max-w-3xl leading-7 text-text-secondary">
            Instead of manual audits or static checklists, GovGraph traces actual data paths
            from source to sink — across API endpoints, services, databases, log sinks, and
            external integrations — then evaluates each flow against configurable policy rules
            for GDPR, SOC2, and other regulatory frameworks.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            icon={<GitBranch className="h-5 w-5" />}
            title="Data Flow Tracing"
            description="Automatically maps how sensitive fields (PII, financial data, health records) move through your codebase from entry to exit."
          />
          <FeatureCard
            icon={<Lock className="h-5 w-5" />}
            title="Policy-as-Code Engine"
            description="Declarative JSON rules evaluate each data flow against GDPR, SOC2, and custom regulatory requirements."
          />
          <FeatureCard
            icon={<Eye className="h-5 w-5" />}
            title="5-Factor Risk Scoring"
            description="Distance to trust boundary, encryption state, sink severity, field sensitivity, and audit visibility — weighted and combined."
          />
          <FeatureCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Confidence-Gated Remediation"
            description="High-confidence fixes get auto-PR previews. Lower-confidence changes are flagged for human review before any code changes."
          />
        </section>

        <section className="mt-6 glass-card p-6">
          <h2 className="font-heading text-xl font-semibold">How It Works</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Step
              number="1"
              icon={<Zap className="h-5 w-5" />}
              title="Connect"
              description="Enter your LatentGraph Project ID and API key. GovGraph connects to the MCP server via stdio transport."
            />
            <Step
              number="2"
              icon={<FileCode className="h-5 w-5" />}
              title="Analyze"
              description="The platform fetches project overview, file metadata, and dependency graphs, then builds a normalized data flow model."
            />
            <Step
              number="3"
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Report"
              description="Risk scores, policy violations, and remediation previews are generated with full code-path evidence for each finding."
            />
          </div>
        </section>

        <section className="mt-6 glass-card p-6">
          <h2 className="font-heading text-xl font-semibold">Technology Stack</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TechRow label="Frontend" value="Next.js 16, React 19, Tailwind CSS, React Flow, Recharts" />
            <TechRow label="Analysis Engine" value="TypeScript policy-as-code, 5-factor risk scorer" />
            <TechRow label="Code Intelligence" value="LatentGraph MCP (Model Context Protocol)" />
            <TechRow label="Transport" value="stdio MCP client with TOON-encoded responses" />
            <TechRow label="Persistence" value="Prisma + PostgreSQL (schema ready)" />
            <TechRow label="Exports" value="CSV and JSON compliance reports" />
          </div>
        </section>

        <section className="mt-6 glass-card p-6">
          <h2 className="font-heading text-xl font-semibold">Built for BuildSprint</h2>
          <p className="mt-3 max-w-3xl leading-7 text-text-secondary">
            GovGraph was built for LatentForce.ai&apos;s BuildSprint hackathon. It demonstrates
            how LatentGraph&apos;s code intelligence API can power specialized developer tools
            that go beyond code search — turning structural code understanding into actionable
            compliance insights.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-glow hover:shadow-glow"
            >
              Start Scanning
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-5 transition-colors hover:border-accent/40">
      <div className="grid h-9 w-9 place-items-center rounded-md border border-accent/25 bg-accent-subtle text-accent">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-text-secondary">{description}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-subtle font-heading text-lg font-bold text-accent">
        {number}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-accent">{icon}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line/50 bg-elevated/30 px-4 py-3">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-accent">{label}</span>
      <span className="text-sm text-text-secondary">{value}</span>
    </div>
  );
}
