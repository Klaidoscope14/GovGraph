"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, ArrowRight, Zap, GitBranch, Lock, Eye } from "lucide-react";

const SCAN_PHASES = [
  { label: "Connecting to LatentGraph MCP...", duration: 1200 },
  { label: "Fetching project overview...", duration: 1400 },
  { label: "Analyzing file dependencies...", duration: 1800 },
  { label: "Building data flow graph...", duration: 1600 },
  { label: "Scoring risk factors...", duration: 1200 },
  { label: "Evaluating compliance policies...", duration: 1000 },
  { label: "Generating remediation previews...", duration: 800 },
];

export default function LandingPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [branch, setBranch] = useState("main");
  const [isScanning, setIsScanning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) return;

    setIsScanning(true);
    setError("");
    setPhase(0);

    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase < SCAN_PHASES.length) {
        setPhase(currentPhase);
      }
    }, 1400);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId.trim(),
          apiKey: apiKey.trim(),
          branch: branch.trim() || "main",
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        let message = `Scan failed: ${response.status}`;
        try {
          const body = await response.json();
          if (body.error) message = body.error;
        } catch {
          const text = await response.text().catch(() => "");
          if (text) message = text;
        }
        throw new Error(message);
      }

      setPhase(SCAN_PHASES.length - 1);
      await new Promise((r) => setTimeout(r, 600));
      router.push("/dashboard");
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Scan failed");
      setIsScanning(false);
    }
  }

  if (isScanning) {
    return <ScanAnimation phase={phase} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mist px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-accent/30 bg-accent-subtle shadow-glow">
            <ShieldCheck className="h-8 w-8 text-accent" />
          </div>
          <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight">GovGraph</h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-text-secondary">
            Continuous source-code-level data governance and compliance for legacy codebases.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Feature icon={<GitBranch className="h-4 w-4" />} label="Data Flow Tracing" />
          <Feature icon={<Lock className="h-4 w-4" />} label="Policy Engine" />
          <Feature icon={<Eye className="h-4 w-4" />} label="Risk Scoring" />
        </div>

        <form onSubmit={handleScan} className="mt-8 glass-card p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-accent" />
            Connect to LatentGraph
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Enter your LatentGraph project credentials to scan a codebase.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary" htmlFor="projectId">
                Project ID
              </label>
              <input
                id="projectId"
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="e.g. 173e9e75-e371-4275-a521-d70ddc4eb2c5"
                className="mt-1 h-10 w-full rounded-md border border-line bg-elevated px-3 text-sm text-ink placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary" htmlFor="apiKey">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your LatentGraph API key"
                className="mt-1 h-10 w-full rounded-md border border-line bg-elevated px-3 text-sm text-ink placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary" htmlFor="branch">
                Branch
              </label>
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="mt-1 h-10 w-full rounded-md border border-line bg-elevated px-3 text-sm text-ink placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-risk-critical/30 bg-risk-critical/10 px-3 py-2 text-xs text-risk-critical">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!projectId.trim() || !apiKey.trim()}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-white transition-all hover:bg-accent-glow hover:shadow-glow disabled:opacity-40 disabled:hover:bg-accent disabled:hover:shadow-none"
          >
            Analyze Codebase
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-3 text-center text-[11px] text-text-secondary/60">
            Get credentials at{" "}
            <span className="text-accent/70">latentgraph.latentforce.ai/auth</span>
          </p>
        </form>

        <div className="mt-6 text-center">
          <a href="/about" className="text-xs text-text-secondary transition-colors hover:text-accent">
            About GovGraph
          </a>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line/50 bg-surface/50 px-3 py-3 text-center backdrop-blur-sm">
      <div className="text-accent">{icon}</div>
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

function ScanAnimation({ phase }: { phase: number }) {
  const progress = ((phase + 1) / SCAN_PHASES.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mist px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 animate-pulse rounded-full bg-accent/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border border-accent/30 bg-accent-subtle">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>

        <h2 className="mt-8 font-heading text-2xl font-bold">Scanning Codebase</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Analyzing data flows, dependencies, and compliance posture...
        </p>

        <div className="mt-8">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-2 rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="text-sm text-accent">{SCAN_PHASES[phase].label}</span>
          </div>
        </div>

        <div className="mt-8 space-y-2">
          {SCAN_PHASES.map((step, i) => (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-md px-4 py-2 text-left text-xs transition-all duration-300 ${
                i < phase
                  ? "text-risk-low opacity-60"
                  : i === phase
                    ? "bg-accent-subtle/50 text-accent"
                    : "text-text-secondary/30"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  i < phase ? "bg-risk-low" : i === phase ? "animate-pulse bg-accent" : "bg-line"
                }`}
              />
              {step.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
