export type NodeType =
  | "function"
  | "module"
  | "db_table"
  | "api_endpoint"
  | "external_sink"
  | "event_bus_topic"
  | "log_sink";

export type FieldClass = "PII" | "SECRET" | "FINANCIAL" | "UNKNOWN";
export type EncryptionState = boolean | "unknown";
export type Severity = "low" | "medium" | "high" | "critical";
export type FindingStatus = "open" | "accepted_risk" | "fixed" | "dismissed";
export type RemediationConfidence = "high" | "needs_review";

export interface GovGraphNode {
  id: string;
  type: NodeType;
  name: string;
  metadata: {
    filePath?: string;
    language?: string;
    module?: string;
    label?: string;
  };
}

export interface GovGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  fieldName: string;
  fieldClass: FieldClass;
  encrypted: EncryptionState;
  crossesTrustBoundary: boolean;
  hopIndex: number;
  pathId: string;
  evidence: string;
}

export interface DataFlowPath {
  pathId: string;
  fieldName: string;
  fieldClass: FieldClass;
  sourceNodeId: string;
  sinkNodeId: string;
  edgeIds: string[];
  documented: boolean;
}

export interface ScoredFlow {
  pathId: string;
  score: number;
  rationale: string;
  factors: {
    distanceToBoundary: number;
    encryptionRisk: number;
    sinkSeverity: number;
    fieldSensitivity: number;
    auditVisibility: number;
  };
}

export interface PolicyCondition {
  field?: keyof PolicySubject;
  op?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "includes";
  value?: string | number | boolean | string[];
  all?: PolicyCondition[];
  any?: PolicyCondition[];
}

export interface PolicyRule {
  id: string;
  regulation: string;
  description: string;
  severity: Severity;
  condition: PolicyCondition;
}

export interface PolicySubject {
  pathId: string;
  fieldClass: FieldClass;
  fieldName: string;
  encrypted: EncryptionState;
  crossesTrustBoundary: boolean;
  sinkType: NodeType;
  sinkName: string;
  score: number;
  documented: boolean;
}

export interface Violation {
  id: string;
  pathId: string;
  ruleId: string;
  regulation: string;
  severity: Severity;
  score: number;
  narrative: string;
  status: FindingStatus;
  evidence: {
    fieldName: string;
    fieldClass: FieldClass;
    path: string[];
    rationale: string;
    ruleDescription: string;
  };
}

export interface RemediationPreview {
  id: string;
  findingId: string;
  strategy: string;
  confidence: RemediationConfidence;
  patch: string;
  rationale: string;
}

export interface ComplianceSummary {
  overallRisk: number;
  openFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  regulatedFlows: number;
}

export interface GovGraphAnalysis {
  repository: {
    id: string;
    name: string;
    branch: string;
    commitSha: string;
    scannedAt: string;
  };
  nodes: GovGraphNode[];
  edges: GovGraphEdge[];
  flows: DataFlowPath[];
  scoredFlows: ScoredFlow[];
  rules: PolicyRule[];
  findings: Violation[];
  remediations: RemediationPreview[];
  summary: ComplianceSummary;
}

export interface LatentGraphFileSummary {
  path: string;
  summary?: string;
  module_name?: string;
  file_category?: string;
  execution_context?: string;
  modification_impact?: string;
  key_symbols?: Array<{
    name: string;
    kind: string;
    signature?: string;
    fqn?: string;
    is_async?: boolean;
    decorators?: string[];
    visibility?: string;
    docstring?: string;
  }>;
  exports?: Array<{
    name: string;
    kind?: string;
    summary?: string;
    key_methods?: string[];
  }>;
  internal_imports?: Array<{
    name: string;
    from_path?: string;
    kind?: string;
    is_relative?: boolean;
  }>;
  api_endpoints?: Array<{
    method: string;
    path: string;
    handler?: string;
    framework?: string;
  }>;
  storage_backends?: Array<{
    type: string;
    hint: string;
  }>;
  constants?: Array<{
    name: string;
    value_preview?: string;
  }>;
  degraded?: boolean;
}

export interface LatentGraphDependencySummary {
  path?: string;
  outgoing?: Array<{
    target: string;
    implicit?: boolean;
    imports?: string[];
    summary?: string;
    data_flow?: string;
  }>;
  incoming?: Array<{
    source: string;
    implicit?: boolean;
    imports?: string[];
    summary?: string;
    data_flow?: string;
  }>;
  learnings?: string[];
  degraded?: boolean;
}

export interface LatentGraphFixture {
  overview: {
    architecture_summary: string;
    top_level_modules: Array<{
      path: string;
      file_count: number;
      summary: string;
    }>;
  };
  files: LatentGraphFileSummary[];
  dependencies: LatentGraphDependencySummary[];
}
