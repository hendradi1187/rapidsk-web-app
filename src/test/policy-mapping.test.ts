import { describe, expect, it } from "vitest";
import { resolveDatasetPolicyForDataset } from "@/lib/policy-mapping";
import type { Dataset } from "@/api/types/data-catalog";
import type { Policy } from "@/api/types/governance";

const dataset: Dataset = {
  dataset_id: "ds-1",
  dataset_name: "Wilayah Kerja PHE",
  schema_name: "Schema WK",
  provider_name: "PHE",
  classification: "restricted",
  status: "published",
  domain: "wilayah_kerja",
  level: "L1",
};

describe("resolveDatasetPolicyForDataset", () => {
  it("returns exact match when domain and level line up", () => {
    const policies: Policy[] = [
      {
        policy_id: "p-1",
        policy_name: "WK ACCESS L1",
        classification: "ACCESS",
        domain: "wilayah_kerja",
        level: "L1",
        status: "PUBLISHED",
      },
    ];

    const result = resolveDatasetPolicyForDataset(policies, dataset);
    expect(result.status).toBe("matched");
    expect(result.policy?.policy_id).toBe("p-1");
  });

  it("returns ambiguous when two policies are equally strong", () => {
    const policies: Policy[] = [
      {
        policy_id: "p-1",
        policy_name: "WK ACCESS L1 A",
        classification: "ACCESS",
        domain: "wilayah_kerja",
        level: "L1",
        status: "PUBLISHED",
      },
      {
        policy_id: "p-2",
        policy_name: "WK ACCESS L1 B",
        classification: "ACCESS",
        domain: "wilayah_kerja",
        level: "L1",
        status: "PUBLISHED",
      },
    ];

    const result = resolveDatasetPolicyForDataset(policies, dataset);
    expect(result.status).toBe("ambiguous");
    expect(result.policy).toBeNull();
  });

  it("returns missing when nothing compatible is found", () => {
    const policies: Policy[] = [
      {
        policy_id: "p-1",
        policy_name: "Seismik ACCESS L3",
        classification: "ACCESS",
        domain: "seismik",
        level: "L3",
        status: "PUBLISHED",
      },
    ];

    const result = resolveDatasetPolicyForDataset(policies, dataset);
    expect(result.status).toBe("missing");
    expect(result.policy).toBeNull();
  });
});
