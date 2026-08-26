import type { Severity } from "@/lib/govgraph/types";

export const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export const severityColors: Record<Severity, string> = {
  critical: "#b73144",
  high: "#d85b41",
  medium: "#d59d23",
  low: "#2f9e6d"
};

export const nodeColors: Record<string, string> = {
  function: "#ffffff",
  module: "#eef5f3",
  db_table: "#f5f0e6",
  api_endpoint: "#eaf0f7",
  external_sink: "#fff0ea",
  event_bus_topic: "#f0edf7",
  log_sink: "#fff2f4"
};

