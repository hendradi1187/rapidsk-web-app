import { describe, expect, it } from "vitest";
import {
  countAgreementIssues,
  countContractIssues,
  countDatasetIssues,
  countTransferIssues,
  getApiErrorSummary,
} from "@/lib/provider-flow-diagnostics";

describe("provider flow diagnostics", () => {
  it("summarizes backend validation errors", () => {
    const summary = getApiErrorSummary({
      response: {
        data: {
          errors: [
            { field: "transfer_process_id", message: "Received: history" },
            { field: "contract_id", message: "Missing" },
          ],
        },
      },
    });

    expect(summary.errorCount).toBe(2);
    expect(summary.detail).toContain("transfer_process_id");
    expect(summary.detail).toContain("contract_id");
  });

  it("counts malformed provider flow rows", () => {
    expect(countDatasetIssues([{ endpoint: {} }, { endpoint: { url: "x", protocol: "REST_API", access_type: "PRIVATE" }, schema_id: "s" }])).toEqual({
      missingEndpointUrl: 1,
      missingProtocol: 1,
      missingAccessType: 1,
      missingSchema: 1,
    });

    expect(countContractIssues([{ datasets: [], contract_policies: [] }, {}])).toEqual({
      missingDatasets: 1,
      missingPolicies: 1,
      missingConsumerId: 2,
      missingProviderId: 2,
    });

    expect(countAgreementIssues([{ status: "ACTIVE" }, {}])).toEqual({
      missingContractId: 2,
      missingEffectiveFrom: 2,
      missingEffectiveTo: 2,
      missingStatus: 1,
    });

    expect(countTransferIssues([{ status: "completed", from: "a", to: "b", agreement_id: "x", lastSync: "now" }, {}])).toEqual({
      missingStatus: 1,
      missingFrom: 1,
      missingTo: 1,
      missingAgreementId: 1,
      missingTimestamp: 1,
    });
  });
});
