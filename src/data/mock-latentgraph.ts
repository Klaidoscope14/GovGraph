import type { LatentGraphFixture } from "@/lib/govgraph/types";

export const mockLatentGraphFixture: LatentGraphFixture = {
  overview: {
    architecture_summary:
      "LegacyClaims is a Django-style insurance claims monolith with shared services, background export jobs, and a mixed internal/external analytics pipeline.",
    top_level_modules: [
      {
        path: "claims",
        file_count: 12,
        summary: "Claim intake, profile lookup, and eligibility logic."
      },
      {
        path: "exports",
        file_count: 7,
        summary: "Legacy batch exports to S3 and partner processors."
      },
      {
        path: "observability",
        file_count: 5,
        summary: "Application logging, telemetry, and compliance annotations."
      }
    ]
  },
  files: [
    {
      path: "claims/api.py",
      module_name: "claims",
      summary:
        "Public API endpoint that fetches user profile details including email and ssn before claim export.",
      file_category: "api",
      modification_impact: "high",
      key_symbols: [
        {
          name: "get_claim_profile",
          kind: "function",
          signature: "def get_claim_profile(request, claim_id)",
          fqn: "claims/api.py::get_claim_profile"
        }
      ],
      api_endpoints: [
        {
          method: "GET",
          path: "/api/claims/{claim_id}/profile",
          handler: "get_claim_profile",
          framework: "django"
        }
      ]
    },
    {
      path: "claims/services/profile_service.py",
      module_name: "claims",
      summary:
        "Loads user profile data from the member_profile table and returns ssn, email, dob, and policy account number.",
      file_category: "domain_service",
      modification_impact: "high",
      key_symbols: [
        {
          name: "ProfileService.get_profile",
          kind: "method",
          signature: "def get_profile(self, claim_id)",
          fqn: "claims/services/profile_service.py::ProfileService.get_profile"
        }
      ],
      storage_backends: [
        {
          type: "postgres",
          hint: "member_profile"
        }
      ]
    },
    {
      path: "exports/legacy_export_job.py",
      module_name: "exports",
      summary:
        "Background job serializes claim profile payloads and sends ssn and policy data to partner exports.",
      file_category: "background_job",
      modification_impact: "high",
      key_symbols: [
        {
          name: "LegacyExportJob.run",
          kind: "method",
          signature: "def run(self, claim_id)",
          fqn: "exports/legacy_export_job.py::LegacyExportJob.run"
        }
      ],
      storage_backends: [
        {
          type: "s3",
          hint: "analytics-raw-claims"
        }
      ]
    },
    {
      path: "observability/logger.py",
      module_name: "observability",
      summary:
        "Central logging wrapper. Current implementation logs export payloads without redacting ssn or email.",
      file_category: "observability",
      modification_impact: "medium",
      key_symbols: [
        {
          name: "log_export_payload",
          kind: "function",
          signature: "def log_export_payload(payload)",
          fqn: "observability/logger.py::log_export_payload"
        }
      ]
    },
    {
      path: "exports/s3_writer.py",
      module_name: "exports",
      summary:
        "Writes raw export payload to S3. Bucket encryption configuration is not visible in code.",
      file_category: "integration",
      modification_impact: "high",
      key_symbols: [
        {
          name: "write_claim_export",
          kind: "function",
          signature: "def write_claim_export(payload)",
          fqn: "exports/s3_writer.py::write_claim_export"
        }
      ],
      storage_backends: [
        {
          type: "s3",
          hint: "analytics-raw-claims"
        }
      ]
    },
    {
      path: "claims/audit_annotations.py",
      module_name: "claims",
      summary:
        "Contains explicit compliant markers for email notification flows but no marker for SSN export.",
      file_category: "compliance_metadata",
      modification_impact: "low",
      key_symbols: [
        {
          name: "COMPLIANT_EMAIL_FLOW",
          kind: "constant",
          fqn: "claims/audit_annotations.py::COMPLIANT_EMAIL_FLOW"
        }
      ],
      constants: [
        {
          name: "COMPLIANT_EMAIL_FLOW",
          value_preview: "email notification flow covered by DPA-17"
        }
      ]
    },
    {
      path: "integrations/partner_client.py",
      module_name: "exports",
      summary:
        "Sends claim payloads to a third-party partner API. Uses HTTPS client but forwards policy_account_number.",
      file_category: "external_integration",
      modification_impact: "high",
      key_symbols: [
        {
          name: "PartnerClient.submit_claim",
          kind: "method",
          signature: "def submit_claim(self, payload)",
          fqn: "integrations/partner_client.py::PartnerClient.submit_claim"
        }
      ]
    }
  ],
  dependencies: [
    {
      path: "claims/api.py",
      outgoing: [
        {
          target: "claims/services/profile_service.py",
          imports: ["ProfileService"],
          summary: "API handler fetches claim profile data.",
          data_flow: "claim_id enters API handler and profile data including ssn/email returns to caller."
        },
        {
          target: "exports/legacy_export_job.py",
          imports: ["LegacyExportJob"],
          summary: "API schedules legacy claim export.",
          data_flow: "profile payload is forwarded to the background export job."
        }
      ],
      incoming: []
    },
    {
      path: "claims/services/profile_service.py",
      outgoing: [
        {
          target: "claims/audit_annotations.py",
          imports: ["COMPLIANT_EMAIL_FLOW"],
          summary: "Reads email flow audit marker.",
          data_flow: "email has a compliance marker, ssn does not."
        }
      ],
      incoming: [
        {
          source: "claims/api.py",
          imports: ["ProfileService"],
          summary: "API calls profile service.",
          data_flow: "profile data returns to API."
        }
      ]
    },
    {
      path: "exports/legacy_export_job.py",
      outgoing: [
        {
          target: "observability/logger.py",
          imports: ["log_export_payload"],
          summary: "Logs export payload before sending.",
          data_flow: "ssn and email are logged in plaintext."
        },
        {
          target: "exports/s3_writer.py",
          imports: ["write_claim_export"],
          summary: "Writes raw claim export.",
          data_flow: "ssn is written to analytics-raw S3 with unknown encryption state."
        },
        {
          target: "integrations/partner_client.py",
          imports: ["PartnerClient"],
          summary: "Submits claim export to partner API.",
          data_flow: "policy_account_number leaves the service over HTTPS."
        }
      ],
      incoming: [
        {
          source: "claims/api.py",
          imports: ["LegacyExportJob"],
          summary: "API schedules legacy export.",
          data_flow: "profile payload is forwarded to job."
        }
      ]
    },
    {
      path: "observability/logger.py",
      outgoing: [],
      incoming: [
        {
          source: "exports/legacy_export_job.py",
          imports: ["log_export_payload"],
          summary: "Export job logs payload.",
          data_flow: "plaintext ssn/email reaches central logger."
        }
      ]
    },
    {
      path: "exports/s3_writer.py",
      outgoing: [],
      incoming: [
        {
          source: "exports/legacy_export_job.py",
          imports: ["write_claim_export"],
          summary: "Export job writes raw payload.",
          data_flow: "ssn reaches S3 bucket with unknown encryption evidence."
        }
      ]
    },
    {
      path: "integrations/partner_client.py",
      outgoing: [],
      incoming: [
        {
          source: "exports/legacy_export_job.py",
          imports: ["PartnerClient"],
          summary: "Export job submits partner claim.",
          data_flow: "policy account number crosses to partner over HTTPS."
        }
      ]
    }
  ]
};
