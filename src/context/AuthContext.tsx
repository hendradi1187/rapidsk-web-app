import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { keycloak, isKeycloakConfigured } from "@/auth/keycloak";
import { useKeycloak } from "@/auth/KeycloakProvider";

// ─── Role Types (CANONICAL — IAM-3) ────────────────────────────────────
//
// 7 canonical role yang dipakai di seluruh ekosistem (rapiDSK + SPEKTRUM).
// Frontend HANYA mengenal role ini. Legacy rapiDSK roles
// (ORG_ADMIN, DATA_PROVIDER, READONLY, dll) di-map oleh IAM/backend layer
// sebelum JWT di-issue. Lihat `docs/IAM_ROLE_MAPPING_MATRIX.md`.
//
//   SUPER_ADMIN  : Platform admin, full access cross-org
//   ADMIN        : Organization admin
//   PROVIDER     : Data provider participant (KKKS)
//   CONSUMER     : Data consumer participant (Regulator)
//   VIEWER       : Read-only user
//   AUDITOR      : Compliance/audit officer
//   GIS_ANALYST  : Spatial data power user

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PROVIDER"
  | "CONSUMER"
  | "VIEWER"
  | "AUDITOR"
  | "GIS_ANALYST";

const CANONICAL_ROLES: readonly AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "PROVIDER",
  "CONSUMER",
  "VIEWER",
  "AUDITOR",
  "GIS_ANALYST",
] as const;

const isCanonicalRole = (role: string): role is AppRole =>
  (CANONICAL_ROLES as readonly string[]).includes(role);

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  /**
   * Primary canonical role (untuk backward compat dengan komponen lama).
   * Phase 1B: di-derive sebagai roles[0] kalau dari Keycloak.
   */
  role: AppRole;
  /** Multi-role array (canonical). Empty fallback = ["VIEWER"]. */
  roles: AppRole[];
  /** Granular permission strings (mis. `gis.query`, `consent.revoke`). */
  permissions: string[];
  category: { name: string; code: string; description: string };
  group: { name: string; code: string; description: string; priority: number };
}

interface AuthContextType {
  user: AuthUser | null;
  /** Primary canonical role (single, untuk komponen yang masih single-role). */
  role: AppRole;
  /** Multi-role array. */
  roles: AppRole[];
  /** Granular permissions. */
  permissions: string[];
  isAuthenticated: boolean;
  /** Check if current user has at least one of the given canonical roles. */
  hasRole: (roles: AppRole[]) => boolean;
  /** Check if current user has the given permission key. */
  hasPermission: (permission: string) => boolean;
  /** Sync user into context (called after legacy login). */
  setAuthUser: (userInfo: AuthUser) => void;
  /** Clear auth state (called after logout). */
  clearAuth: () => void;
}

// ─── Role Derivation (legacy rapiDSK login response) ─────────────────
//
// Map backend category.code + group.code → canonical AppRole.
// Hanya dipakai saat Keycloak tidak aktif (legacy fallback).

export const deriveRole = (
  categoryCode: string,
  groupCode: string,
): AppRole => {
  const cat = categoryCode.toUpperCase();
  const grp = groupCode.toUpperCase();

  if (
    grp.includes("SUPER") ||
    grp.includes("PLATFORM") ||
    cat.includes("PLATFORM") ||
    cat.includes("SYSTEM")
  ) {
    return "SUPER_ADMIN";
  }
  if (grp.includes("ADMIN")) {
    return "ADMIN";
  }
  if (grp.includes("AUDIT") || cat.includes("AUDIT") || cat.includes("COMPLIANCE")) {
    return "AUDITOR";
  }
  if (grp.includes("GIS") || cat.includes("GIS") || cat.includes("SPATIAL")) {
    return "GIS_ANALYST";
  }
  if (cat.includes("KKKS") || cat.includes("ENTERPRISE")) {
    return "PROVIDER";
  }
  if (
    cat.includes("REGULATOR") ||
    cat.includes("GOV") ||
    cat.includes("GOVERNMENT") ||
    cat.includes("SKK")
  ) {
    return "CONSUMER";
  }

  return "VIEWER";
};

// ─── Keycloak JWT → AuthUser ─────────────────────────────────────────

/**
 * Parse Keycloak JWT (already authenticated) into AuthUser shape.
 * Filter realm roles ke canonical 7 saja, drop default Keycloak roles
 * (offline_access, uma_authorization, default-roles-*).
 */
const buildUserFromKeycloak = (): AuthUser | null => {
  if (!keycloak?.authenticated) return null;

  const t = keycloak.tokenParsed as Record<string, unknown> | undefined;
  if (!t) return null;

  // Realm roles dari `realm_access.roles` (Keycloak default location)
  const realmRolesRaw = (t.realm_access as { roles?: string[] } | undefined)
    ?.roles ?? [];

  // Filter ke canonical roles only
  const canonicalRoles: AppRole[] = realmRolesRaw.filter(isCanonicalRole);

  // Permissions claim (custom mapper di Keycloak realm)
  const permissionsRaw = t.permissions;
  const permissions: string[] = Array.isArray(permissionsRaw)
    ? permissionsRaw.filter((p): p is string => typeof p === "string")
    : [];

  // Pick primary role: pertama dari canonicalRoles, fallback VIEWER
  const primary: AppRole = canonicalRoles[0] ?? "VIEWER";

  // Participant info dari custom mapper (kalau ada)
  const participantRaw = t.participant as
    | { organization_name?: string; role_type?: string }
    | undefined;
  const orgName = participantRaw?.organization_name ?? "";

  return {
    id: (t.sub as string) ?? "",
    email: (t.email as string) ?? "",
    full_name:
      (t.name as string) ?? (t.preferred_username as string) ?? "User",
    role: primary,
    roles: canonicalRoles.length > 0 ? canonicalRoles : ["VIEWER"],
    permissions,
    // Map participant info ke shape category/group lama untuk backward compat
    category: {
      name: orgName,
      code: orgName,
      description: "",
    },
    group: {
      name: primary,
      code: primary,
      description: "",
      priority: 0,
    },
  };
};

// ─── Context ──────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = "user_info";
const STORAGE_KEY_TOKEN = "auth_token";

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return null;

    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) {
      return {
        id: "",
        email: "",
        full_name: "Super Admin",
        role: "SUPER_ADMIN",
        roles: ["SUPER_ADMIN"],
        permissions: [],
        category: { name: "Platform", code: "PLATFORM", description: "" },
        group: { name: "Admin", code: "ADMIN", description: "", priority: 0 },
      };
    }

    const parsed = JSON.parse(raw);
    const role = deriveRole(
      parsed.category?.code || "",
      parsed.group?.code || "",
    );
    return {
      id: parsed.id || "",
      email: parsed.email || "",
      full_name: parsed.full_name || "",
      role,
      roles: parsed.roles && Array.isArray(parsed.roles) ? parsed.roles : [role],
      permissions:
        parsed.permissions && Array.isArray(parsed.permissions)
          ? parsed.permissions
          : [],
      category: parsed.category || { name: "", code: "", description: "" },
      group: parsed.group || { name: "", code: "", description: "", priority: 0 },
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authenticated: keycloakAuthenticated, tokenVersion } = useKeycloak();

  const [user, setUser] = useState<AuthUser | null>(() => {
    // Initial state: try Keycloak first, then legacy storage
    if (isKeycloakConfigured && keycloak?.authenticated) {
      return buildUserFromKeycloak();
    }
    return loadUserFromStorage();
  });

  // Re-sync saat Keycloak state berubah (login, logout, token refresh)
  useEffect(() => {
    if (isKeycloakConfigured && keycloakAuthenticated) {
      const fromKc = buildUserFromKeycloak();
      if (fromKc) {
        setUser(fromKc);
        return;
      }
    }
    // Fallback / atau user belum login via Keycloak — coba legacy
    setUser(loadUserFromStorage());
    // tokenVersion di-include supaya re-sync setiap token refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keycloakAuthenticated, tokenVersion]);

  const setAuthUser = useCallback((userInfo: AuthUser) => {
    setUser(userInfo);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (rolesToCheck: AppRole[]): boolean => {
      if (!user) return false;
      return rolesToCheck.some((r) => user.roles.includes(r));
    },
    [user],
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const role: AppRole = user?.role ?? "VIEWER";
  const roles: AppRole[] = user?.roles ?? [];
  const permissions: string[] = user?.permissions ?? [];

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roles,
        permissions,
        isAuthenticated: !!user,
        hasRole,
        hasPermission,
        setAuthUser,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
