import { describe, it, expect } from "vitest";
import { joinEndpointUrl, resolveDatasetEndpointUrl, ogcRuntimeGuardError } from "@/lib/dataset-endpoint";

describe("joinEndpointUrl — jangan buang base path (T3)", () => {
  it("mempertahankan base path saat collection_path berawalan '/'", () => {
    expect(joinEndpointUrl("https://host/ogc/api/", "/collections/WK/items")).toBe(
      "https://host/ogc/api/collections/WK/items",
    );
  });

  it("bekerja tanpa trailing slash pada base", () => {
    expect(joinEndpointUrl("https://host/ogc/api", "collections/WK/items")).toBe(
      "https://host/ogc/api/collections/WK/items",
    );
  });

  it("menormalkan slash ganda di sambungan", () => {
    expect(joinEndpointUrl("https://host/base///", "///path")).toBe("https://host/base/path");
  });

  it("mengembalikan base bila path kosong", () => {
    expect(joinEndpointUrl("https://host/base", "")).toBe("https://host/base");
  });
});

describe("resolveDatasetEndpointUrl", () => {
  it("mengganti {domain_code} dan mempertahankan base path", () => {
    const url = resolveDatasetEndpointUrl({
      endpoint_url: "https://adapter/api/v1/ogc/ogc/",
      endpoint_runtime: {
        collection_path: "/collections/{domain_code}/items",
        domain_code: "WK",
      },
    });
    expect(url).toBe("https://adapter/api/v1/ogc/ogc/collections/WK/items");
  });

  it("mengembalikan base url apa adanya bila runtime kosong", () => {
    expect(resolveDatasetEndpointUrl({ endpoint_url: "https://host/data" })).toBe("https://host/data");
  });

  it("mengembalikan string kosong bila endpoint_url kosong", () => {
    expect(resolveDatasetEndpointUrl({ endpoint_url: "" })).toBe("");
  });
});

describe("ogcRuntimeGuardError — guard edit OGC (D1)", () => {
  it("menolak OGC tanpa collection_path", () => {
    expect(ogcRuntimeGuardError("OGC_API_FEATURES", null)).toMatch(/collection_path/i);
    expect(ogcRuntimeGuardError("OGC_API_FEATURES", {})).toMatch(/collection_path/i);
    expect(ogcRuntimeGuardError("OGC_API_FEATURES", { collection_path: "  " })).toMatch(/collection_path/i);
  });

  it("meloloskan OGC dengan collection_path valid", () => {
    expect(ogcRuntimeGuardError("OGC_API_FEATURES", { collection_path: "/collections/{domain_code}/items" })).toBeNull();
  });

  it("meloloskan protokol non-OGC tanpa syarat runtime", () => {
    expect(ogcRuntimeGuardError("REST_API", null)).toBeNull();
    expect(ogcRuntimeGuardError("rest_api", {})).toBeNull();
  });
});
