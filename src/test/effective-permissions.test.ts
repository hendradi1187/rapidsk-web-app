import { describe, expect, it } from "vitest";
import { normalizeEffectivePermissions, samePermissions } from "@/lib/effective-permissions";

describe("normalizeEffectivePermissions", () => {
  it("reads plain string arrays", () => {
    expect(
      normalizeEffectivePermissions(["contracts.read", "datasets.publish"]),
    ).toEqual(["contracts.read", "datasets.publish"]);
  });

  it("unwraps backend envelopes and de-duplicates values", () => {
    expect(
      normalizeEffectivePermissions({
        data: [
          { code: "contracts.read" },
          { permission: "datasets.publish" },
          { name: "contracts.read" },
          { slug: "connection-pools.manage" },
        ],
      }),
    ).toEqual([
      "contracts.read",
      "datasets.publish",
      "connection-pools.manage",
    ]);
  });

  it("returns empty array for unsupported payloads", () => {
    expect(normalizeEffectivePermissions({ nope: true })).toEqual([]);
  });
});

describe("samePermissions", () => {
  it("matches equal sets regardless of order", () => {
    expect(samePermissions(["b", "a"], ["a", "b"])).toBe(true);
  });

  it("detects different permission sets", () => {
    expect(samePermissions(["a"], ["a", "b"])).toBe(false);
  });
});
