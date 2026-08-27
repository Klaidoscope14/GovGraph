import type { Severity } from "@/lib/govgraph/types";

export const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export const severityColors: Record<Severity, string> = {
  critical: "#e84057",
  high: "#e8772e",
  medium: "#e8b83a",
  low: "#3abf7a"
};

export const nodeColors: Record<string, string> = {
  function: "#1c2230",
  module: "#1a2218",
  db_table: "#221e14",
  api_endpoint: "#161c26",
  external_sink: "#261a14",
  event_bus_topic: "#1c1826",
  log_sink: "#261418"
};
