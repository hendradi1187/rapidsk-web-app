import { describe, it, expect } from "vitest";
import { datasetAdapterLink, groupDatasetsByCollection } from "@/lib/adapter-dataset-link";

// Bentuk runtime live (FASE 0): dataset hasil adapter menyimpan collection_path
// "/api/v1/ogc/ogc/collections/{domain_code}/items".
const adapterRuntime = (domainCode: string) => ({
  version: "1.0",
  domain_code: domainCode,
  source_type: "OGC_API_FEATURES",
  collection_path: "/api/v1/ogc/ogc/collections/{domain_code}/items",
});

describe("datasetAdapterLink", () => {
  it("dataset adapter (runtime lengkap) → viaAdapter true + domainCode benar", () => {
    const link = datasetAdapterLink({ endpoint_runtime: adapterRuntime("WK") });
    expect(link.viaAdapter).toBe(true);
    expect(link.domainCode).toBe("WK");
  });

  it("membaca runtime dari endpoint_metadata.runtime (bentuk mentah BE)", () => {
    const link = datasetAdapterLink({ endpoint_metadata: { runtime: adapterRuntime("sei") } });
    expect(link.viaAdapter).toBe(true);
    // domain_code dinormalkan uppercase
    expect(link.domainCode).toBe("SEI");
  });

  it("dataset manual REST_API (runtime null) → viaAdapter false tanpa throw", () => {
    const link = datasetAdapterLink({ endpoint_runtime: null });
    expect(link.viaAdapter).toBe(false);
    expect(link.domainCode).toBeNull();
  });

  it("source_type OGC tapi collection_path bukan koleksi OGC → false", () => {
    const link = datasetAdapterLink({
      endpoint_runtime: { source_type: "OGC_API_FEATURES", collection_path: "/some/other/path" },
    });
    expect(link.viaAdapter).toBe(false);
  });

  it("source_type bukan OGC (mis. REST) walau ada collection_path → false", () => {
    const link = datasetAdapterLink({
      endpoint_runtime: { source_type: "REST_API", collection_path: "/ogc/collections/WK/items" },
    });
    expect(link.viaAdapter).toBe(false);
  });

  it("runtime string rusak / undefined / null-dataset → false tanpa throw", () => {
    expect(datasetAdapterLink({ endpoint_runtime: "corrupt" as unknown as Record<string, unknown> }).viaAdapter).toBe(false);
    expect(datasetAdapterLink(undefined).viaAdapter).toBe(false);
    expect(datasetAdapterLink(null).viaAdapter).toBe(false);
    expect(datasetAdapterLink({}).viaAdapter).toBe(false);
  });

  it("viaAdapter true tapi domain_code kosong → domainCode null", () => {
    const link = datasetAdapterLink({
      endpoint_runtime: { source_type: "OGC_API_FEATURES", collection_path: "/ogc/collections/{domain_code}/items" },
    });
    expect(link.viaAdapter).toBe(true);
    expect(link.domainCode).toBeNull();
  });
});

describe("groupDatasetsByCollection", () => {
  it("mengelompokkan hanya dataset adapter per domain_code", () => {
    const datasets = [
      { dataset_name: "WK A", endpoint_runtime: adapterRuntime("WK") },
      { dataset_name: "WK B", endpoint_runtime: adapterRuntime("WK") },
      { dataset_name: "SEI A", endpoint_runtime: adapterRuntime("SEI") },
      { dataset_name: "Manual", endpoint_runtime: null },
    ];
    const grouped = groupDatasetsByCollection(datasets);
    expect(grouped.get("WK")?.length).toBe(2);
    expect(grouped.get("SEI")?.length).toBe(1);
    expect(grouped.has("Manual")).toBe(false);
    expect([...grouped.keys()].sort()).toEqual(["SEI", "WK"]);
  });

  it("input null/kosong → Map kosong tanpa throw", () => {
    expect(groupDatasetsByCollection(null).size).toBe(0);
    expect(groupDatasetsByCollection(undefined).size).toBe(0);
    expect(groupDatasetsByCollection([]).size).toBe(0);
  });
});
