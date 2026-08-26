import type { FieldClass } from "./types";

const PII_PATTERNS = [
  /ssn/i,
  /social[_-]?security/i,
  /email/i,
  /phone/i,
  /dob|date[_-]?of[_-]?birth/i,
  /address/i,
  /passport/i,
  /first[_-]?name|last[_-]?name|full[_-]?name/i
];

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /private[_-]?key/i
];

const FINANCIAL_PATTERNS = [
  /card/i,
  /account[_-]?number/i,
  /iban/i,
  /routing/i,
  /payment/i,
  /balance/i,
  /salary/i
];

export function classifyFieldName(value: string): FieldClass {
  if (PII_PATTERNS.some((pattern) => pattern.test(value))) return "PII";
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) return "SECRET";
  if (FINANCIAL_PATTERNS.some((pattern) => pattern.test(value))) return "FINANCIAL";
  return "UNKNOWN";
}

export function extractSensitiveFields(text: string): Array<{ name: string; fieldClass: FieldClass }> {
  const tokens = text
    .split(/[^A-Za-z0-9_]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

  const seen = new Map<string, FieldClass>();
  for (const token of tokens) {
    const fieldClass = classifyFieldName(token);
    if (fieldClass !== "UNKNOWN") {
      seen.set(token, fieldClass);
    }
  }

  return [...seen.entries()].map(([name, fieldClass]) => ({ name, fieldClass }));
}
