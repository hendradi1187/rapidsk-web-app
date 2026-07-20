import { describe, expect, it } from "vitest";
import { describe, expect, it } from "vitest";
import {
  canAccessManagedRoute,
  canApproveParticipants,
  canManageConnectionPools,
  canManageDeploymentConfig,
} from "@/lib/feature-access";
import type { AppRole } from "@/context/AuthContext";

const createContext = (overrides?: {
  role?: AppRole;
  roles?: AppRole[];
  granted?: string[];
}) => {
  const granted = new Set(overrides?.granted ?? []);
  return {
    role: overrides?.role ?? "VIEWER",
    roles: overrides?.roles ?? [overrides?.role ?? "VIEWER"],
    hasPermission: (permission: string) => granted.has(permission),
  };
};

describe("feature access", () => {
  it("blocks deployment config for admin without explicit permission", () => {
    expect(canManageDeploymentConfig(createContext({ role: "ADMIN" }))).toBe(false);
  });

  it("allows connection pool manage by backend permission", () => {
    expect(
      canManageConnectionPools(
        createContext({
          granted: ["connector.connection-pool.manage"],
        }),
      ),
    ).toBe(true);
  });

  it("allows participant approval by backend permission", () => {
    expect(
      canApproveParticipants(
        createContext({
          granted: ["onboarding.registrations.approve"],
        }),
      ),
    ).toBe(true);
  });

  it("hides managed setup route when role fallback exists but permission is missing", () => {
    expect(canAccessManagedRoute("/setup-juknis", createContext({ role: "ADMIN" }))).toBe(false);
  });

  it("allows managed participant route when approval permission exists", () => {
    expect(
      canAccessManagedRoute(
        "/participants/abc",
        createContext({
          role: "VIEWER",
          granted: ["participants.approve"],
        }),
      ),
    ).toBe(true);
  });
});
