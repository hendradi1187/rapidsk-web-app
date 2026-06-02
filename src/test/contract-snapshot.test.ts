import { describe, expect, it } from "vitest";
import {
  mergeContractSnapshot,
  normalizeContractDatasets,
  normalizeContractPolicyIds,
} from "@/api/types/policy-contract";

describe("policy-contract snapshot helpers", () => {
  it("normalizes backend dataset rows that only expose id", () => {
    expect(
      normalizeContractDatasets([
        { id: "dataset-1" },
        { dataset_id: "dataset-2", dataset_policy_id: "policy-2" },
      ])
    ).toEqual([
      { dataset_id: "dataset-1", dataset_policy_id: "" },
      { dataset_id: "dataset-2", dataset_policy_id: "policy-2" },
    ]);
  });

  it("normalizes mixed contract policy rows into ids", () => {
    expect(
      normalizeContractPolicyIds([
        "policy-1",
        { id: "policy-2" },
        { contract_policy_id: "policy-3" },
      ])
    ).toEqual(["policy-1", "policy-2", "policy-3"]);
  });

  it("preserves existing relations when incoming snapshot is summary-only", () => {
    const merged = mergeContractSnapshot(
      {
        id: "contract-1",
        domain_id: "domain-1",
        consumer_id: "consumer-1",
        provider_id: "provider-1",
        name: "Contract A",
        status: "REQUESTED",
        description: "desc",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        datasets: [{ dataset_id: "dataset-1", dataset_policy_id: "policy-1" }],
        contract_policies: [{ contract_policy_id: "contract-policy-1" }],
      },
      {
        id: "contract-1",
        datasets: [],
        contract_policies: [],
        consumer_id: "",
        provider_id: "",
      }
    );

    expect(merged?.datasets).toEqual([{ dataset_id: "dataset-1", dataset_policy_id: "policy-1" }]);
    expect(merged?.contract_policies).toEqual([{ contract_policy_id: "contract-policy-1" }]);
    expect(merged?.consumer_id).toBe("consumer-1");
    expect(merged?.provider_id).toBe("provider-1");
  });

  it("accepts authoritative PATCH payload relations", () => {
    const merged = mergeContractSnapshot(
      {
        id: "contract-1",
        domain_id: "domain-1",
        consumer_id: "consumer-1",
        provider_id: "provider-1",
        name: "Contract A",
        status: "REQUESTED",
        description: "desc",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        datasets: [{ dataset_id: "dataset-1", dataset_policy_id: "policy-1" }],
        contract_policies: [{ contract_policy_id: "contract-policy-1" }],
      },
      {
        id: "contract-1",
        datasets: [{ dataset_id: "dataset-2", dataset_policy_id: "policy-2" }],
        contract_policies: [{ id: "contract-policy-2" } as any],
      },
      { authoritativeRelations: true }
    );

    expect(merged?.datasets).toEqual([{ dataset_id: "dataset-2", dataset_policy_id: "policy-2" }]);
    expect(merged?.contract_policies).toEqual([{ contract_policy_id: "contract-policy-2" }]);
  });
});
