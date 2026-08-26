import type { RemediationPreview, Violation } from "./types";

export function buildRemediationPreviews(findings: Violation[]): RemediationPreview[] {
  return findings
    .filter((finding) => finding.score >= 60)
    .slice(0, 4)
    .map((finding) => {
      const logRelated = finding.evidence.path.some((step) => /log|logger|telemetry/i.test(step));
      const highConfidence = logRelated && finding.ruleId.includes("integrity-confidentiality");

      return {
        id: `remediation:${finding.id}`,
        findingId: finding.id,
        strategy: highConfidence
          ? "Mask sensitive field before logging"
          : "Add a guarded remediation patch for human review",
        confidence: highConfidence ? "high" : "needs_review",
        patch: highConfidence
          ? `- logger.info("export payload", payload)\n+ logger.info("export payload", redactSensitive(payload, ["${finding.evidence.fieldName}"]))`
          : `Suggested change requires owner review because the flow crosses ${finding.evidence.path.length} code locations.\n\nAdd encryption or masking at the closest controlled boundary before ${finding.evidence.path.at(-1)}.`,
        rationale: highConfidence
          ? "The violation is isolated to logging and can be remediated by masking the sensitive key without changing business logic."
          : "The graph indicates a broader runtime path. GovGraph keeps this as a reviewable fix instead of opening an automatic PR."
      };
    });
}
