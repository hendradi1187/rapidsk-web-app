import { describe, expect, it } from "vitest";
import { canAccess, canAccessAny } from "@/config/rbac";
import type { AppRole } from "@/context/AuthContext";

describe("canAccessAny", () => {
  it("allows a route when any assigned role can access it", () => {
    const roles: AppRole[] = ["VIEWER", "AUDITOR"];
    expect(canAccessAny(roles, "/audit")).toBe(true);
  });

  it("blocks a route when no role grants it", () => {
    const roles: AppRole[] = ["VIEWER", "GIS_ANALYST"];
    expect(canAccessAny(roles, "/deployment-config")).toBe(false);
  });

  it("allows permission-based access on managed pages", () => {
    const hasPermission = (permission: string) => permission === "iam.policy.manage";
    expect(canAccess("VIEWER", "/access-control", hasPermission)).toBe(true);
    expect(canAccessAny(["VIEWER"], "/access-control", hasPermission)).toBe(true);
  });
});
